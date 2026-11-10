/**
 * Turns what the scanner says into one decision. Cautious on purpose: we only take content DOWN when the scanner is
 * very sure, and only hide it behind a tap when it is fairly sure. A person reviews every removal and decides on strikes.
 */
export type Likelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
export type Level = 'clean' | 'blur' | 'remove';

export type SafeSearch = { adult?: Likelihood; racy?: Likelihood; violence?: Likelihood };
export type ExplicitFrame = { pornographyLikelihood?: Likelihood };

export function imageVerdict(result: SafeSearch): Level {
  if (result.adult === 'VERY_LIKELY') return 'remove';
  if (result.adult === 'LIKELY' || result.racy === 'VERY_LIKELY' || result.violence === 'VERY_LIKELY') return 'blur';
  return 'clean';
}

export function videoVerdict(frames: ExplicitFrame[]): Level {
  if (frames.some((frame) => frame.pornographyLikelihood === 'VERY_LIKELY')) return 'remove';
  if (frames.some((frame) => frame.pornographyLikelihood === 'LIKELY')) return 'blur';
  return 'clean';
}

export type GeminiScores = { explicit_nudity: number; sexual_activity: number; suggestive: number; graphic_violence: number };

/**
 * Gemini rates each thing from 0 to 1. Its numbers are rough, so the bar for taking something DOWN is high and the bar
 * for hiding it behind a tap is lower. Nothing here gives a strike: a person reviews removals.
 */
export function geminiVerdict(scores: GeminiScores): Level {
  if (scores.sexual_activity >= 0.8 || scores.explicit_nudity >= 0.85) return 'remove';
  if (scores.explicit_nudity >= 0.5 || scores.sexual_activity >= 0.5 || scores.suggestive >= 0.85 || scores.graphic_violence >= 0.85) return 'blur';
  return 'clean';
}
