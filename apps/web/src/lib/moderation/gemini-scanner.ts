import { geminiVerdict, type GeminiScores, type Level } from './verdict';

/**
 * Photo and video scanning with the Gemini API (Google AI Studio key, free tier needs no billing account).
 * Gemini is asked to rate the file and answer in JSON; the decision is made by our own thresholds in verdict.ts.
 * Anything we cannot read, any error, and any timeout is an ERROR (retried later), never a pass.
 */
type Fetch = typeof fetch;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

/** GEMINI_API_BASE only exists so tests can point the app at a fake Gemini. */
const geminiBase = () => (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');

const PROMPT = `You are a strict content-safety classifier for a social app (users are adults). Look at the attached photo or video (every part of it) and rate it. Reply with ONLY a JSON object, no other text:
{"explicit_nudity": number, "sexual_activity": number, "suggestive": number, "graphic_violence": number}
Each value is from 0 to 1 for how likely that is shown anywhere in the media:
- explicit_nudity: exposed genitals, breasts or buttocks (real people, not statues or cartoons).
- sexual_activity: sex acts or clearly sexual poses/contact.
- suggestive: underwear/lingerie, sexualised posing, strong innuendo imagery that is not explicit.
- graphic_violence: gore, serious injury, or a real act of violence.
Ordinary photos (selfies, food, books, hostels, items for sale, memes, text) score 0.`;

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
};

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
}

/** Reads Gemini's answer. Returns null when the answer is missing or not in the shape we asked for. */
export function parseScores(text: string | undefined): GeminiScores | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Record<string, unknown>;
    const explicit = numberOrNull(parsed.explicit_nudity);
    const activity = numberOrNull(parsed.sexual_activity);
    const suggestive = numberOrNull(parsed.suggestive);
    const violence = numberOrNull(parsed.graphic_violence);
    if (explicit === null || activity === null || suggestive === null || violence === null) return null;
    return { explicit_nudity: explicit, sexual_activity: activity, suggestive, graphic_violence: violence };
  } catch {
    return null;
  }
}

export async function scanWithGemini(
  bytes: Uint8Array,
  mimeType: string,
  fetchImpl: Fetch = fetch,
): Promise<{ level: Level; detail: Record<string, unknown> }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Scanning is not configured.');
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const response = await fetchImpl(`${geminiBase()}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType, data: Buffer.from(bytes).toString('base64') } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      // We are asking the model to LOOK at explicit content in order to rate it, so its own filter must not refuse.
      safetySettings: [{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }],
    }),
  });
  const body = (await response.json().catch(() => null)) as GeminiResponse | null;

  // Gemini itself refused to look at it (its built-in protections are always on and cannot be switched off).
  const blockReason = body?.promptFeedback?.blockReason;
  const finishReason = body?.candidates?.[0]?.finishReason;
  if (blockReason || finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT' || finishReason === 'IMAGE_SAFETY') {
    const reason = blockReason ?? finishReason ?? 'SAFETY';
    return { level: reason === 'PROHIBITED_CONTENT' ? 'remove' : 'blur', detail: { blocked: reason } };
  }
  if (!response.ok) throw new Error(`Gemini scan failed (${response.status}).`);

  const scores = parseScores(body?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join(''));
  if (!scores) throw new Error('Gemini gave an answer we could not read.');
  return { level: geminiVerdict(scores), detail: { ...scores } };
}

const TEXT_PROMPT = `You are a content-safety classifier for a social app (users are adults; slang, banter, swearing and Nigerian Pidgin are normal and fine). Read the text below and rate it. Reply with ONLY a JSON object, no other text:
{"harassment_or_threats": number, "hate": number, "sexual_content": number, "self_harm_encouragement": number, "scam": number}
Each value is 0 to 1 for how clearly the text is that thing:
- harassment_or_threats: targeted bullying, threats of violence, doxxing someone.
- hate: attacks on people for tribe, religion, gender, sexuality, disability or school.
- sexual_content: sexually explicit writing, or sexual content about a named person.
- self_harm_encouragement: urging someone to hurt or kill themselves.
- scam: obvious fraud, fake sales, "send money first" schemes.
Normal talk, complaints, jokes and opinions score 0.`;

export type TextScores = { harassment_or_threats: number; hate: number; sexual_content: number; self_harm_encouragement: number; scam: number };
export const TEXT_FLAG_THRESHOLD = 0.8;
const TEXT_LABELS: Record<keyof TextScores, string> = {
  harassment_or_threats: 'Possible harassment or threats',
  hate: 'Possible hate speech',
  sexual_content: 'Possible sexual content',
  self_harm_encouragement: 'Possible encouragement of self-harm',
  scam: 'Possible scam',
};

export function parseTextScores(text: string | undefined): TextScores | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Record<string, unknown>;
    const read = (key: keyof TextScores) => numberOrNull(parsed[key]);
    const scores = { harassment_or_threats: read('harassment_or_threats'), hate: read('hate'), sexual_content: read('sexual_content'), self_harm_encouragement: read('self_harm_encouragement'), scam: read('scam') };
    return Object.values(scores).some((value) => value === null) ? null : (scores as TextScores);
  } catch {
    return null;
  }
}

/** Checks a post's words. Returns a reason when something should be flagged for a moderator, otherwise null. */
export async function scanTextWithGemini(text: string, fetchImpl: Fetch = fetch): Promise<{ reason: string | null; detail: Record<string, unknown> }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Scanning is not configured.');
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const response = await fetchImpl(`${geminiBase()}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${TEXT_PROMPT}\n\nTEXT:\n${text.slice(0, 4000)}` }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      safetySettings: [{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }],
    }),
  });
  const body = (await response.json().catch(() => null)) as GeminiResponse | null;
  const blocked = body?.promptFeedback?.blockReason ?? (['SAFETY', 'PROHIBITED_CONTENT'].includes(body?.candidates?.[0]?.finishReason ?? '') ? body?.candidates?.[0]?.finishReason : undefined);
  if (blocked) return { reason: 'Automatic check could not read this text safely', detail: { blocked } };
  if (!response.ok) throw new Error(`Gemini text check failed (${response.status}).`);
  const scores = parseTextScores(body?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join(''));
  if (!scores) throw new Error('Gemini gave an answer we could not read.');
  const [topKey, topValue] = (Object.entries(scores) as Array<[keyof TextScores, number]>).sort((a, b) => b[1] - a[1])[0];
  return { reason: topValue >= TEXT_FLAG_THRESHOLD ? TEXT_LABELS[topKey] : null, detail: { ...scores } };
}
