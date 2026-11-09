import type { DetectionItem } from '#/modules/sync/domain/detection/detection-item.type.ts';

// A detector may change the nature only where the system still owns it: a plain expense or income
// that Lucas did not choose, not split, not categorized by him and not tied to anything that pays
// (an invoice, an occurrence, a bill). What he decided is never undone (BR-TRX-006).
export function canTakeDetectedNature(item: DetectionItem): boolean {
  return (
    item.natureSetBy === 'system' &&
    (item.nature === 'expense' || item.nature === 'income') &&
    !item.isSplit &&
    !item.hasUserCategory &&
    !item.isLinked
  );
}
