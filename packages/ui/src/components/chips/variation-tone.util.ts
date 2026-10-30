/** A variation only gets color from this magnitude (in percent) up (ui adjustment 4). */
export const VARIATION_COLOR_THRESHOLD = 10;

export type VariationTone = 'neutral' | 'bad' | 'good';

/**
 * Color of a variation badge. Under 10% (either way) it stays neutral; from 10% a rise is "bad"
 * and a fall is "good" (spending), or the other way around when `risingIsGood` (income).
 */
export function variationTone(percent: number, risingIsGood = false): VariationTone {
  if (Math.abs(percent) < VARIATION_COLOR_THRESHOLD) return 'neutral';
  const rising = percent > 0;
  return rising === risingIsGood ? 'good' : 'bad';
}
