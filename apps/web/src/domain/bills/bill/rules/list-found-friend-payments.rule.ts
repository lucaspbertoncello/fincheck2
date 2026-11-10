import type { Agenda } from '@fincheck/shared/dashboard/agenda/agenda.type.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

/** A Pix the system found in the account for a debt a friend owes you, not linked to it yet. */
export type FoundFriendPayment = {
  billId: string;
  /** The transaction found: it holds the date and is what "Vincular" turns into the payment. */
  transactionId: string;
  /** What the Pix covers of the debt, in cents (at most what was left of it). */
  amountCents: number;
  /** The agenda item of the debt: what the "Vincular" of A pagar e receber takes. */
  item: Agenda.Item;
};

/**
 * The payments found and not yet linked, by person. Only the debts a friend owes you count (what
 * you owe has its own flow), and only the items the agenda already discounted with the presumed
 * payment: that is why the card "A receber de amigos" can read less than the Amigos tab, which
 * counts what is registered. The person is keyed as `computeFriendBalances` keys it ("JULIA"
 * groups "Júlia" and "julia"), one entry per Pix, in the order of the agenda.
 */
export function listFoundFriendPayments(
  items: readonly Agenda.Item[],
): Map<string, FoundFriendPayment[]> {
  const byPerson = new Map<string, FoundFriendPayment[]>();

  for (const item of items) {
    const { billId } = item.source;
    if (item.badge !== 'friend_receivable' || item.flow !== 'in') continue;
    if (item.source.type !== 'bill' || !billId || !item.counterparty) continue;
    if (item.presumedPaidCents <= 0 || !item.presumedTransactionId) continue;

    const key = normalizeText(item.counterparty);
    byPerson.set(key, [
      ...(byPerson.get(key) ?? []),
      {
        billId,
        transactionId: item.presumedTransactionId,
        amountCents: item.presumedPaidCents,
        item,
      },
    ]);
  }

  return byPerson;
}
