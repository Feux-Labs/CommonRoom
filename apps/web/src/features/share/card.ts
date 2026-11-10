/**
 * Story-size share cards (1080 x 1920), drawn in the browser. The card carries a small link line at
 * the bottom: that line is how someone who sees the card on another app finds Common Room.
 */

export type CardTheme = 'blue-hour' | 'soft-sky' | 'warm-glow' | 'rose-note';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

/** Same colours as the gradient text cards in the feed. */
export const CARD_GRADIENTS: Record<CardTheme, [string, string]> = {
  'blue-hour': ['#1f4fb8', '#6a3fcf'],
  'soft-sky': ['#0e7f93', '#3a5fcf'],
  'warm-glow': ['#b8530f', '#b32d5b'],
  'rose-note': ['#c2306c', '#7340c4'],
};

export function isCardTheme(value: unknown): value is CardTheme {
  return typeof value === 'string' && value in CARD_GRADIENTS;
}

/** Greedy word wrap. Words longer than a line are split so nothing runs off the card. */
export function wrapText(measure: (text: string) => number, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      let remaining = word;
      while (measure(remaining) > maxWidth) {
        let cut = remaining.length - 1;
        while (cut > 1 && measure(remaining.slice(0, cut)) > maxWidth) cut -= 1;
        if (line) { lines.push(line); line = ''; }
        lines.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut);
      }
      const candidate = line ? `${line} ${remaining}` : remaining;
      if (measure(candidate) <= maxWidth) line = candidate;
      else { lines.push(line); line = remaining; }
    }
    lines.push(line);
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function shortLink(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

export async function renderShareCard(options: {
  text: string;
  theme?: CardTheme;
  /** Small line at the bottom. Pass the link people should follow. */
  link: string;
  kicker?: string;
}): Promise<Blob> {
  const { text, theme = 'blue-hour', link, kicker } = options;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Images can’t be made in this browser.');

  const family = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  try { await document.fonts.ready; } catch { /* fonts API unavailable: system font is used */ }

  const [from, to] = CARD_GRADIENTS[theme];
  const gradient = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  context.fillStyle = gradient;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Soft shapes, like the app's own artwork.
  context.fillStyle = 'rgba(255,255,255,0.07)';
  context.beginPath(); context.arc(1010, 330, 330, 0, Math.PI * 2); context.fill();
  context.beginPath(); context.arc(70, 1560, 260, 0, Math.PI * 2); context.fill();

  const marginX = 96;
  const maxWidth = CARD_WIDTH - marginX * 2;

  // Brand row.
  context.fillStyle = '#fff';
  for (let index = 0; index < 3; index += 1) {
    context.globalAlpha = index === 0 ? 1 : index === 1 ? 0.55 : 0.3;
    context.beginPath(); context.arc(marginX + 14 + index * 34, 150, 12, 0, Math.PI * 2); context.fill();
  }
  context.globalAlpha = 1;
  context.font = `500 40px ${family}`;
  context.textBaseline = 'alphabetic';
  context.fillText('common room', marginX + 124, 164);

  if (kicker) {
    context.globalAlpha = 0.8;
    context.font = `500 38px ${family}`;
    context.fillText(kicker, marginX, 640);
    context.globalAlpha = 1;
  }

  // The words: the largest size that fits about 12 lines.
  const maxLines = 12;
  let size = 88;
  let lines: string[] = [];
  for (; size >= 40; size -= 4) {
    context.font = `500 ${size}px ${family}`;
    lines = wrapText((value) => context.measureText(value).width, text.trim(), maxWidth);
    if (lines.length <= maxLines) break;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  }
  const lineHeight = Math.round(size * 1.28);
  const blockHeight = lines.length * lineHeight;
  let y = Math.max(kicker ? 720 : 560, (CARD_HEIGHT - blockHeight) / 2 + size * 0.4);
  context.fillStyle = '#fff';
  context.font = `500 ${size}px ${family}`;
  for (const line of lines) { context.fillText(line, marginX, y); y += lineHeight; }

  // Small link line.
  context.globalAlpha = 0.85;
  context.font = `500 36px ${family}`;
  context.fillText(shortLink(link), marginX, CARD_HEIGHT - 150);
  context.globalAlpha = 1;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The image could not be made.');
  return blob;
}

/** Adds ?s=<channel> so analytics can credit sign-ups to where a link was shared. Keeps other params. */
export function withSource(url: string, channel: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('s', channel);
    return parsed.toString();
  } catch {
    return url;
  }
}
