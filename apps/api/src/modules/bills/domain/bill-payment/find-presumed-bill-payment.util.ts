import { matchesCounterparty } from '#/modules/bills/domain/bill-payment/matches-counterparty.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';

// How far from what is left a transaction may be and still be the payment (R$ 1,00), and how many
// days after the due day it may come (BR-BIL-002, the "pagamento presumido").
export const AMOUNT_TOLERANCE_CENTS = 100;
const DAYS_AFTER_DUE = 5;

// The transaction that most likely paid a bill and still has no link: the "pago, falta vincular" of
// the agenda. The money already left the balance, so the Livre must not count the bill again.
// It must have the exact value (R$ 1,00 apart at most) of what the bill still lacks, fall between
// the day the bill was created and five days after its due day, carry the name of the person when
// the bill has one, and be the only one that fits. With more than one it is only a suggestion and
// nothing is presumed (null). The caller brings the candidates already of the right direction
// (a debit to pay, a credit to receive), whole, counting, not tied to anything and not dismissed
// for this bill.
export function findPresumedBillPayment(input: {
  counterparty: string | null;
  remainingCents: number;
  dueOn: string;
  createdAt: string;
  candidates: FindPresumedBillPayment.Candidate[];
}): FindPresumedBillPayment.Candidate | null {
  const from = businessDateOfInstant(input.createdAt).value;
  const until = BusinessDate.of(input.dueOn).addDays(DAYS_AFTER_DUE).value;

  const fits = input.candidates.filter(
    (candidate) =>
      candidate.occurredOn >= from &&
      candidate.occurredOn <= until &&
      Math.abs(Math.abs(candidate.amountCents) - input.remainingCents) <= AMOUNT_TOLERANCE_CENTS &&
      (input.counterparty === null || matchesCounterparty(input.counterparty, candidate)),
  );

  return fits.length === 1 ? (fits[0] ?? null) : null;
}

export namespace FindPresumedBillPayment {
  export type Candidate = {
    id: string;
    accountId: string;
    // With sign.
    amountCents: number;
    occurredOn: string;
    description: string;
    bankDescription: string | null;
    counterparty: string | null;
  };
}
