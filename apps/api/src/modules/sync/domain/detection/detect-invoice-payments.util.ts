import { canTakeDetectedNature } from '#/modules/sync/domain/detection/can-take-detected-nature.util.ts';
import type { DetectionItem } from '#/modules/sync/domain/detection/detection-item.type.ts';
import { isPaymentMarker } from '#/modules/sync/domain/detection/is-payment-marker.util.ts';
import { pairMirrors } from '#/modules/sync/domain/detection/pair-mirrors.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { dayNumber } from '#/shared/date/day-number.util.ts';

// The mirror of a payment: the same value within R$ 0,01 and up to 3 days apart.
const MIRROR = { toleranceCents: 1, maxDays: 3 } as const;
// A debit equals the total of an invoice within R$ 1,00, from the closing to 5 days after the due date.
const INVOICE_TOLERANCE_CENTS = 100;
const DAYS_AFTER_DUE = 5;
// An invoice under this total (R$ 5,00) never takes a debit: a total of zero would match any small debit.
const INVOICE_MIN_TOTAL_CENTS = 500;

// The transactions that pay an invoice (`domain model.md` 4.10, detectors 1 and 2). Pure.
//
// 1. A credit on a card is a payment when the description says so ("PAGAMENTO", "PGTO", "PAGTO",
//    "PAG FATURA"), or when a debit of an own account (not a card) mirrors it. A credit with neither
//    is a refund, never an income.
// 2. A debit of an own account is a payment when it mirrors a credit of a card (total, partial or
//    minimum, any value), or when it equals, within R$ 1,00, the total of a closed or overdue invoice
//    that is not paid, between its closing and 5 days after its due date. Of the debits that fit one
//    invoice only one pays it (the exact value first, then the nearest to the due date; the others
//    stay what they are), and an invoice that already has a debit that pays it (one marked before, or
//    one that settled a credit) takes no other.
//
// Only the new transactions start a search, but the partner may be an old one (the credit of today
// finds the debit of yesterday): the banks do not send both sides together. The pairs are chosen
// from the closest to the farthest, and a credit pairs with one debit only (`pairMirrors`); a credit
// and a debit that were already marked as a pair are settled and are not offered again to a new
// transaction. Answers the ids that become a payment, only of what the system may change
// (`canTakeDetectedNature`); one already marked stays and is not answered again. Both sides become
// `invoice_payment`, outside spending and income (BR-INV-002, BR-TRX-006).
export function detectInvoicePayments(input: {
  items: readonly DetectionItem[];
  invoices: readonly PayableInvoice[];
}): string[] {
  const markable = new Set(input.items.filter(canTakeDetectedNature).map((item) => item.id));
  const alreadyPayments = input.items.filter(
    (item) => item.nature === 'invoice_payment' && item.natureSetBy === 'system' && !item.isLinked,
  );
  // The pairs the earlier rounds already made stay as they are: a credit that has its debit does not
  // go to a new debit of the same value.
  const settled = new Set<string>();
  for (const pair of pairMirrors({
    positives: alreadyPayments.filter((item) => item.isCard && item.amountCents > 0),
    negatives: alreadyPayments.filter((item) => !item.isCard && item.amountCents < 0),
    ...MIRROR,
  })) {
    settled.add(pair.positive.id);
    settled.add(pair.negative.id);
  }
  const offered = new Set(alreadyPayments.map((item) => item.id));
  const available = input.items.filter(
    (item) => (markable.has(item.id) || offered.has(item.id)) && !settled.has(item.id),
  );
  const cardCredits = available.filter((item) => item.isCard && item.amountCents > 0);
  const accountDebits = available.filter((item) => !item.isCard && item.amountCents < 0);
  const marked = new Set<string>();
  const mark = (id: string) => {
    if (markable.has(id)) marked.add(id);
  };

  // A credit that says it is a payment.
  for (const credit of cardCredits) {
    if (credit.isNew && isPaymentMarker(credit.description)) mark(credit.id);
  }

  // The two sides of a payment, whichever of them came now.
  const paired = new Set<string>();
  for (const pair of pairMirrors({
    positives: cardCredits,
    negatives: accountDebits,
    ...MIRROR,
    accept: (credit, debit) => credit.isNew || debit.isNew,
  })) {
    mark(pair.positive.id);
    mark(pair.negative.id);
    paired.add(pair.negative.id);
  }

  // A debit with no credit that equals an invoice still to pay: one debit per invoice.
  const paying = input.items.filter(
    (item) =>
      !item.isCard &&
      item.amountCents < 0 &&
      (item.nature === 'invoice_payment' || paired.has(item.id)),
  );
  const taken = new Set<string>();
  const invoices = input.invoices.toSorted(
    (a, b) => a.dueOn.localeCompare(b.dueOn) || a.accountId.localeCompare(b.accountId),
  );
  for (const invoice of invoices) {
    if (invoice.totalCents < INVOICE_MIN_TOTAL_CENTS) continue;
    if (paying.some((debit) => fitsInvoice(debit, invoice) !== null)) continue;
    const best = accountDebits
      .filter(
        (debit) =>
          debit.isNew && markable.has(debit.id) && !paired.has(debit.id) && !taken.has(debit.id),
      )
      .flatMap((debit) => {
        const difference = fitsInvoice(debit, invoice);

        return difference === null
          ? []
          : [
              {
                debit,
                exact: difference === 0,
                days: Math.abs(dayNumber(debit.occurredOn) - dayNumber(invoice.dueOn)),
                difference,
              },
            ];
      })
      .toSorted(
        (a, b) =>
          Number(b.exact) - Number(a.exact) ||
          a.days - b.days ||
          a.difference - b.difference ||
          a.debit.id.localeCompare(b.debit.id),
      )[0];

    if (best) {
      mark(best.debit.id);
      taken.add(best.debit.id);
    }
  }

  return [...marked];
}

// How far (in cents) the debit is from the total of the invoice, when it falls in its window (from
// the closing to 5 days after the due date) and within the tolerance; null when it does not fit.
function fitsInvoice(debit: DetectionItem, invoice: PayableInvoice): number | null {
  const on = debit.occurredOn;
  const difference = Math.abs(Math.abs(debit.amountCents) - invoice.totalCents);
  const inWindow =
    invoice.closesOn <= on && on <= BusinessDate.of(invoice.dueOn).addDays(DAYS_AFTER_DUE).value;

  return inWindow && difference <= INVOICE_TOLERANCE_CENTS ? difference : null;
}

export type PayableInvoice = {
  accountId: string;
  closesOn: string;
  dueOn: string;
  totalCents: number;
};
