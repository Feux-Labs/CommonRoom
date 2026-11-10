const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Compact age used across feeds: "now", "12m", "3h", "Yesterday", "Mon", "12 Mar". */
export function shortAge(value: string | number | Date, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return 'now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 2 * DAY) return 'Yesterday';
  const date = new Date(time);
  if (diff < 7 * DAY) return date.toLocaleDateString('en-GB', { weekday: 'short' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Longer age for listings: "2h ago", "Yesterday", "2 days ago". */
export function relativeAge(value: string | number | Date, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 2 * DAY) return 'Yesterday';
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)} days ago`;
  return new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Day label for message separators: "Today", "Yesterday", "12 Mar". */
export function dayLabel(value: string | number | Date, now = Date.now()): string {
  const date = new Date(value);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const time = date.getTime();
  if (time >= startOfToday) return 'Today';
  if (time >= startOfToday - DAY) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** 1200 → "1.2k", 312 → "312". */
export function compactCount(value: number): string {
  if (!Number.isFinite(value) || value < 1000) return String(Math.max(0, Math.trunc(value || 0)));
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
}

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

export function formatNaira(value: number): string {
  return naira.format(value).replace('NGN', '₦').replace(/\s/g, '');
}

export function initials(name: string | null | undefined): string {
  const clean = (name ?? '').trim();
  return clean ? clean.slice(0, 1).toUpperCase() : '?';
}
