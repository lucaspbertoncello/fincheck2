import { isMirrorCredit } from '#/modules/invoices/domain/invoice-payment/is-mirror-credit.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// How far off the amount of the debit may be from what the invoice lacks (R$ 1,00), and how long
// after the due date a payment is still looked for.
const AMOUNT_TOLERANCE_CENTS = 100;
const DAYS_AFTER_DUE = 5;

export type PaymentCandidate = {
  transactionId: string;
  accountId: string;
  // With the sign of the transaction: the debit of an own account is negative.
  amount: Money;
  occurredOn: BusinessDate;
  description: string;
};

export type PaymentSuggestion = {
  transaction: PaymentCandidate;
  // `true` when it is safe to count as paid already: the mirror credit exists on the card, or it is
  // the only candidate in the window.
  isPresumed: boolean;
};

// The "Pagamento encontrado" of a closed, partial or overdue invoice. Among the debits of own
// accounts (already marked as invoice payment by the import detectors), it keeps the ones that
//
// 1. fall between the closing and five days after the due date, inclusive;
// 2. are not tied to any invoice yet and were not dismissed for this one;
// 3. match a credit of this card (mirror: the same value within R$ 0,01, up to 3 days apart) or
//    have an absolute value within R$ 1,00 of what the invoice still lacks.
//
// Several: the one with the smallest difference to what is lacking; a tie goes to the most recent.
// `null` when there is none. A suggestion only becomes a link when Lucas confirms it.
export function findPaymentSuggestion(input: {
  debits: PaymentCandidate[];
  credits: PaymentCandidate[];
  // What the invoice still lacks, before the presumed payment. Positive.
  lacking: Money;
  closesOn: BusinessDate;
  dueOn: BusinessDate;
  excludedTransactionIds: ReadonlySet<string>;
}): PaymentSuggestion | null {
  const windowEnd = input.dueOn.addDays(DAYS_AFTER_DUE);

  const eligible = input.debits
    .filter(
      (debit) =>
        debit.amount.isNegative() &&
        !input.excludedTransactionIds.has(debit.transactionId) &&
        !debit.occurredOn.isBefore(input.closesOn) &&
        !windowEnd.isBefore(debit.occurredOn),
    )
    .map((debit) => ({
      debit,
      hasMirror: input.credits.some((credit) => isMirrorCredit(debit, credit)),
      difference: Math.abs(Math.abs(debit.amount.cents) - input.lacking.cents),
    }))
    .filter((entry) => entry.hasMirror || entry.difference <= AMOUNT_TOLERANCE_CENTS);

  const best = eligible.toSorted(
    (a, b) =>
      a.difference - b.difference ||
      b.debit.occurredOn.value.localeCompare(a.debit.occurredOn.value) ||
      b.debit.transactionId.localeCompare(a.debit.transactionId),
  )[0];
  if (!best) return null;

  return { transaction: best.debit, isPresumed: best.hasMirror || eligible.length === 1 };
}
