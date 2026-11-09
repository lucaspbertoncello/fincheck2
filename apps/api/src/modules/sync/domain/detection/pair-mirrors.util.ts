import type { DetectionItem } from '#/modules/sync/domain/detection/detection-item.type.ts';
import { dayNumber } from '#/shared/date/day-number.util.ts';

// Pairs each positive with a negative that mirrors it: the same value within `toleranceCents`, no
// more than `maxDays` apart, and `accept` agreeing (at least one of them new, different accounts...).
// The pairs are chosen from the closest to the farthest (days, then the difference of value, then the
// ids), each item in one pair only, so the best pairing wins whatever the order the items come in:
// of two debits that could pay a credit, the nearer one does. The value is tested first, as it is the
// cheap test that leaves almost no pair for the date.
export function pairMirrors(input: {
  positives: readonly DetectionItem[];
  negatives: readonly DetectionItem[];
  toleranceCents: number;
  maxDays: number;
  accept?: (positive: DetectionItem, negative: DetectionItem) => boolean;
}): { positive: DetectionItem; negative: DetectionItem }[] {
  const candidates: {
    positive: DetectionItem;
    negative: DetectionItem;
    days: number;
    difference: number;
  }[] = [];

  for (const positive of input.positives) {
    for (const negative of input.negatives) {
      const difference = Math.abs(positive.amountCents + negative.amountCents);
      if (difference > input.toleranceCents) continue;
      const days = Math.abs(dayNumber(positive.occurredOn) - dayNumber(negative.occurredOn));
      if (days > input.maxDays || positive.id === negative.id) continue;
      if (input.accept && !input.accept(positive, negative)) continue;
      candidates.push({ positive, negative, days, difference });
    }
  }

  const used = new Set<string>();
  const pairs: { positive: DetectionItem; negative: DetectionItem }[] = [];
  for (const candidate of candidates.toSorted(
    (a, b) =>
      a.days - b.days ||
      a.difference - b.difference ||
      a.positive.id.localeCompare(b.positive.id) ||
      a.negative.id.localeCompare(b.negative.id),
  )) {
    if (used.has(candidate.positive.id) || used.has(candidate.negative.id)) continue;
    used.add(candidate.positive.id);
    used.add(candidate.negative.id);
    pairs.push({ positive: candidate.positive, negative: candidate.negative });
  }

  return pairs;
}
