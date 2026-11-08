import type { PaymentCandidate } from '#/modules/invoices/domain/invoice-payment/find-payment-suggestion.util.ts';

// How far off the value of the mirror credit may be (R$ 0,01) and how many days apart.
const MIRROR_TOLERANCE_CENTS = 1;
const MIRROR_TOLERANCE_DAYS = 3;

// The credit on the card that mirrors a debit of an own account: positive, the same value within
// R$ 0,01 and up to 3 days apart (detector 1 of 4.10: the debit and its credit are one payment).
export function isMirrorCredit(debit: PaymentCandidate, credit: PaymentCandidate): boolean {
  const sameValue =
    Math.abs(Math.abs(debit.amount.cents) - Math.abs(credit.amount.cents)) <=
    MIRROR_TOLERANCE_CENTS;
  const earliest = debit.occurredOn.addDays(-MIRROR_TOLERANCE_DAYS);
  const latest = debit.occurredOn.addDays(MIRROR_TOLERANCE_DAYS);

  return (
    credit.amount.cents > 0 &&
    sameValue &&
    !credit.occurredOn.isBefore(earliest) &&
    !latest.isBefore(credit.occurredOn)
  );
}
