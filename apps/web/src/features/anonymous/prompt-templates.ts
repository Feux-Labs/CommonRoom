import type { CardTheme } from '@/features/share/card';

export type PromptTemplate = { id: string; text: string; theme: CardTheme };

/** The starter prompts. Always available, with or without AI. Every one can be edited before saving. */
export const PROMPT_TEMPLATES: PromptTemplate[] = [
  { id: 'crush-hint', text: 'Got a crush on me? 💘 Give me 1 hint to who you are… 3 words max', theme: 'rose-note' },
  { id: 'default', text: 'Send me an anonymous message', theme: 'blue-hour' },
  { id: 'never-said', text: 'Tell me what you never had the guts to say 🥺', theme: 'soft-sky' },
  { id: 'are-you-my-crush', text: 'Are you my crush? 👀', theme: 'rose-note' },
  { id: 'nice-thing', text: 'Say the nice thing you never said ❤️', theme: 'warm-glow' },
  { id: 'confess', text: 'Confess something about me 🤫', theme: 'blue-hour' },
  { id: 'hostel-gist', text: 'Hostel gist: what did you see? 👀', theme: 'warm-glow' },
  { id: 'rate-vibe', text: 'Rate my vibe, be honest 😭', theme: 'soft-sky' },
  { id: 'date', text: 'Who should I date? Choose wisely 💀', theme: 'rose-note' },
  { id: 'roast', text: 'Roast me. I can take it 🔥', theme: 'warm-glow' },
];

/** A prompt that says "3 words max" limits what visitors can type to that many words. */
export function wordLimitOf(prompt: string | null | undefined): number | null {
  const match = prompt?.match(/(\d{1,2})\s*words?\s*max/i);
  const limit = match ? Number(match[1]) : null;
  return limit && limit >= 1 && limit <= 50 ? limit : null;
}

/** Keeps only the first `limit` words, leaving a trailing space so typing the next word still works. */
export function limitWords(value: string, limit: number): string {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= limit) return value;
  return words.slice(0, limit).join(' ');
}

export const DEFAULT_PROMPT = 'Send me an anonymous message';
export const PROMPT_MAX = 140;
