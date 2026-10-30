import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';

/** Which owner route "Registrar pagamento" calls, read from the item `source`. */
export type PaymentTarget =
  | { kind: 'bill'; billId: string }
  | { kind: 'invoice'; accountId: string; month: string }
  | { kind: 'occurrence'; occurrenceId: string };

export function resolvePaymentTarget(item: Pick<Agenda.Item, 'source'>): PaymentTarget | null {
  const { source } = item;
  if (source.type === 'bill' && source.billId) return { kind: 'bill', billId: source.billId };
  if (source.type === 'invoice' && source.accountId && source.month) {
    return { kind: 'invoice', accountId: source.accountId, month: source.month };
  }
  if (source.type === 'occurrence' && source.occurrenceId) {
    return { kind: 'occurrence', occurrenceId: source.occurrenceId };
  }
  return null;
}
