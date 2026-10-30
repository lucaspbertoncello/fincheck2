import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import type { BillStatus } from '@fincheck/ui';

/**
 * Where the item stands for the row. A payment detected and not yet linked (R1) wins over the
 * rest: the money already left the bank, so the row says "pago, falta vincular".
 */
export function resolveRowStatus(
  item: Pick<Agenda.Item, 'state' | 'presumedPaidCents' | 'presumedTransactionId' | 'paidCents'>,
): BillStatus {
  if (item.state === 'settled') return 'settled';
  if (item.presumedPaidCents > 0 && item.presumedTransactionId) return 'paid-unlinked';
  if (item.state === 'overdue') return 'late';
  if (item.state === 'partial' && item.paidCents > 0) return 'partial';
  return 'open';
}
