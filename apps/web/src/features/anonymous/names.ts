/**
 * Anonymous IDs: auto-made names like quietfox4821, witty89, jin90.
 *
 * Rules (see docs/PRODUCT_PLAN_V1.md, section 4):
 * - built only from clean word lists plus digits, never from real details;
 * - 3 to 20 characters (the database allows 3 to 24);
 * - never contains digit runs with hateful or meme meaning (88, 1488, 69, 420, 666);
 * - never matches official-sounding or impersonating words.
 * Uniqueness is enforced by the database (register_anonymous_identity), not here.
 */

const ADJECTIVES = [
  'quiet', 'brave', 'lucky', 'sleepy', 'swift', 'bright', 'calm', 'witty', 'bold', 'cosmic',
  'mellow', 'jolly', 'sunny', 'zesty', 'chill', 'clever', 'gentle', 'rapid', 'nimble', 'steady',
  'great', 'happy', 'lively', 'noble', 'uncanny', 'smooth', 'cheeky', 'dreamy',
];

const NOUNS = [
  'fox', 'owl', 'lion', 'falcon', 'mango', 'comet', 'river', 'drum', 'panda', 'ember', 'cedar',
  'pixel', 'nomad', 'scholar', 'ranger', 'danfo', 'baobab', 'sparrow', 'tiger', 'cloud', 'spark',
  'jin', 'zebra', 'raven', 'maple', 'orbit', 'echo', 'nova',
];

const BLOCKED_DIGIT_RUNS = ['88', '1488', '69', '420', '666'];
const RESERVED = ['admin', 'administrator', 'support', 'moderator', 'mod', 'official', 'commonroom', 'staff', 'system', 'help', 'anonymous', 'null', 'undefined'];

export const ANON_ID_MIN = 3;
export const ANON_ID_MAX = 24;
const GENERATED_MAX = 20;

type Random = () => number;

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}

function digits(random: Random, length: number): string {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    let value = '';
    for (let index = 0; index < length; index += 1) value += Math.floor(random() * 10);
    if (!BLOCKED_DIGIT_RUNS.some((run) => value.includes(run))) return value;
  }
  return '31'.padEnd(length, '7');
}

function hasBlockedDigits(value: string) {
  return BLOCKED_DIGIT_RUNS.some((run) => value.includes(run));
}

/** Returns a fresh Anonymous ID such as "quietfox4821". */
export function generateAnonymousId(random: Random = Math.random): string {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const roll = random();
    let id: string;
    if (roll < 0.35) id = `${pick(ADJECTIVES, random)}${digits(random, 2)}`; // witty89
    else if (roll < 0.55) id = `${pick(NOUNS, random)}${digits(random, 2)}`; // jin90
    else id = `${pick(ADJECTIVES, random)}${pick(NOUNS, random)}${digits(random, 4)}`; // quietfox4821
    if (id.length >= ANON_ID_MIN && id.length <= GENERATED_MAX && !hasBlockedDigits(id)) return id;
  }
  return `nova${digits(random, 4)}`;
}

/** Client-side check for IDs people type themselves. The database is still the source of truth. */
export function anonymousIdProblem(value: string): string | null {
  const id = value.trim();
  if (id.length < ANON_ID_MIN) return `Use at least ${ANON_ID_MIN} characters.`;
  if (id.length > ANON_ID_MAX) return `Use ${ANON_ID_MAX} characters or fewer.`;
  if (!/^[\p{L}\p{N}_]+$/u.test(id)) return 'Use letters, numbers and underscores only.';
  const plain = id.toLowerCase().replace(/[^a-z]/g, '');
  if (RESERVED.some((word) => plain === word || plain.startsWith(word))) return 'That name looks official. Pick a different one.';
  if (hasBlockedDigits(id)) return 'That number isn’t allowed. Change the digits.';
  return null;
}
