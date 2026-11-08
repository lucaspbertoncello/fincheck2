// The tolerance of a match by value: 15% of the target (decision, BR-REC-006), and "exact" is
// R$ 1,00 of it (decision R2).
const TOLERANCE_PERCENT = 15;
const EXACT_TOLERANCE_CENTS = 100;

// Whether a value (positive cents) matches one of the targets an occurrence offers: the expected
// amount, what is left, or one of its parts. It matches when it is within 15% of a target, and it
// is exact when it is within R$ 1,00 of one. Integer math only (`|v - x| x 100 <= 15 x`).
export function computeAmountMatch(
  valueCents: number,
  targets: readonly number[],
): { matches: boolean; exact: boolean } {
  let matches = false;
  let exact = false;
  for (const target of targets) {
    if (target <= 0) continue;
    const gap = Math.abs(valueCents - target);
    if (gap * 100 <= TOLERANCE_PERCENT * target) matches = true;
    if (gap <= EXACT_TOLERANCE_CENTS) exact = true;
  }

  return { matches, exact };
}
