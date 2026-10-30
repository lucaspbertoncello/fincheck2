import type { RulePhraseSegment } from '@fincheck/ui';

/** The names in bold, listed the way a sentence does: "a", "a e b", "a, b e c". */
export function buildNameSegments(names: readonly string[]): RulePhraseSegment[] {
  const segments: RulePhraseSegment[] = [];

  names.forEach((name, index) => {
    if (index > 0) segments.push(index === names.length - 1 ? ' e ' : ', ');
    segments.push({ strong: name });
  });
  return segments;
}
