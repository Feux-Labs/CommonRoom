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

/** Loads a photo for the card. Returns null if it cannot be read (blocked, offline), so the card is simply made without it. */
async function loadPhoto(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
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
  /** A received message shown above the words, for public reply cards ("they asked, you answered"). */
  question?: string;
  /** The post's photo: it goes into the card above the words, so a shared post carries both. */
  image?: string;
}): Promise<Blob> {
  const { text, theme = 'blue-hour', link, kicker, question, image } = options;
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
  const centerX = CARD_WIDTH / 2;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const measure = (value: string) => context.measureText(value).width;

  // Watermark: the three dots and the name, centred at the top.
  context.fillStyle = '#fff';
  for (let index = 0; index < 3; index += 1) {
    context.globalAlpha = index === 0 ? 1 : index === 1 ? 0.55 : 0.3;
    context.beginPath(); context.arc(centerX - 40 + index * 40, 150, 14, 0, Math.PI * 2); context.fill();
  }
  context.globalAlpha = 1;
  context.font = `600 56px ${family}`;
  context.fillText('common room', centerX, 245);

  // Lay the content out first, so the whole group can sit in the middle of the card.
  const kickerHeight = kicker ? 90 : 0;
  let questionLines: string[] = [];
  const questionFont = `500 54px ${family}`;
  const questionLineHeight = 70;
  let panelHeight = 0;
  if (question) {
    context.font = questionFont;
    questionLines = wrapText(measure, question.trim(), maxWidth - 120);
    if (questionLines.length > 6) {
      questionLines = questionLines.slice(0, 6);
      questionLines[5] = `${questionLines[5].replace(/\s+\S*$/, '')}…`;
    }
    panelHeight = questionLines.length * questionLineHeight + 100;
  }
  const photo = image ? await loadPhoto(image) : null;
  const photoHeight = photo ? 700 : 0;
  const photoBlock = photo ? photoHeight + 60 : 0;
  const maxLines = photo ? 5 : question ? 8 : 12;
  let size = photo ? 60 : question ? 72 : 88;
  let lines: string[] = [];
  for (; size >= 40; size -= 4) {
    context.font = `500 ${size}px ${family}`;
    lines = wrapText(measure, text.trim(), maxWidth);
    if (lines.length <= maxLines) break;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  }
  const lineHeight = Math.round(size * 1.28);
  const textHeight = lines.length * lineHeight;
  const gap = question ? 110 : 0;
  const groupHeight = kickerHeight + photoBlock + (question ? panelHeight + gap : 0) + textHeight;
  const areaTop = 330;
  const areaBottom = CARD_HEIGHT - 300;
  let y = areaTop + Math.max(0, (areaBottom - areaTop - groupHeight) / 2);

  if (kicker) {
    context.globalAlpha = 0.85;
    context.font = `500 40px ${family}`;
    context.fillStyle = '#fff';
    context.fillText(kicker, centerX, y + 40);
    context.globalAlpha = 1;
    y += kickerHeight;
  }
  if (photo) {
    // The photo, cropped to fill a rounded frame (like the feed does), above the words.
    context.save();
    context.beginPath();
    context.roundRect(marginX, y, maxWidth, photoHeight, 48);
    context.clip();
    const scale = Math.max(maxWidth / photo.width, photoHeight / photo.height);
    const drawWidth = photo.width * scale;
    const drawHeight = photo.height * scale;
    context.drawImage(photo, marginX + (maxWidth - drawWidth) / 2, y + (photoHeight - drawHeight) / 2, drawWidth, drawHeight);
    context.restore();
    y += photoBlock;
  }
  if (question) {
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(marginX, y, maxWidth, panelHeight, 48);
    context.fill();
    context.fillStyle = '#14183a';
    context.font = questionFont;
    let questionY = y + 50 + 54;
    for (const line of questionLines) { context.fillText(line, centerX, questionY); questionY += questionLineHeight; }
    y += panelHeight + gap;
  }
  context.fillStyle = '#fff';
  context.font = `500 ${size}px ${family}`;
  let lineY = y + size * 0.85;
  for (const line of lines) { context.fillText(line, centerX, lineY); lineY += lineHeight; }

  // Footer: the link people follow, and a small invitation to get their own.
  context.globalAlpha = 0.9;
  // A long link shrinks to fit instead of running off the card.
  const linkText = shortLink(link);
  let linkSize = 38;
  context.font = `500 ${linkSize}px ${family}`;
  while (linkSize > 20 && measure(linkText) > maxWidth) { linkSize -= 2; context.font = `500 ${linkSize}px ${family}`; }
  context.fillText(linkText, centerX, CARD_HEIGHT - 190);
  context.globalAlpha = 0.7;
  context.font = `400 30px ${family}`;
  context.fillText('Get your own anonymous link at commonroom.feuxlabs.com.ng', centerX, CARD_HEIGHT - 130);
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
