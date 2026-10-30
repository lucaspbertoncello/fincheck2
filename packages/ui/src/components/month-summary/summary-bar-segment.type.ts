/** One painted stretch of a summary bar. `percent` is of the full bar width, 0 to 100. */
export type SummaryBarSegment = {
  percent: number;
  tone: 'brand' | 'gain' | 'muted' | 'strong' | 'loss';
};
