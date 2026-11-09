import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// How far back the first round of an account looks (BR-SYN-005): the most the Pluggy keeps, which is
// the last 12 months (365 days in Open Finance).
const FIRST_FETCH_DAYS = 365;
// How far before the cursor the next rounds look again, to catch a change or a removal of what came
// before (`domain model.md` 4.8).
const OVERLAP_DAYS = 30;

// The first day a round asks the Pluggy for, for one account: without a cursor (the first round, or
// an account that has just been adopted) the whole history; with one, 30 days before it.
export function computeFetchFrom(cursorOn: string | null, today: BusinessDate): string {
  if (cursorOn === null) return today.addDays(-FIRST_FETCH_DAYS).value;

  return BusinessDate.of(cursorOn).addDays(-OVERLAP_DAYS).value;
}
