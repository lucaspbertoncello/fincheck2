import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';

// The state of a bill, the first rule that holds: settled (paid everything), overdue (has a due day
// and today is after it), partial (paid something), open. Whole cents, no float.
export function computeBillState(input: {
  amountCents: number;
  paidCents: number;
  dueOn: string | null;
  today: string;
}): Bill.Status {
  if (input.paidCents >= input.amountCents) return 'settled';
  if (input.dueOn !== null && input.today > input.dueOn) return 'overdue';
  if (input.paidCents > 0) return 'partial';

  return 'open';
}
