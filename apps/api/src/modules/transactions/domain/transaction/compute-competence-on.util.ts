import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The day a transaction counts as spending (BR-INV-001, BR-INV-003, Q1). Without a plan it is the
// day it happened. An installment, manual or imported, counts on the day of the purchase in the
// month of its invoice, held at the end of the month when that day does not exist there (the
// purchase of the 31st, in a 30-day month). Calculated, never stored: the imported installment
// keeps the date the bank sent and still lands in the right month.
export function computeCompetenceOn(input: {
  occurredOn: BusinessDate;
  invoiceMonth: Month | null;
  planPurchaseOn: BusinessDate | null;
}): BusinessDate {
  if (input.planPurchaseOn === null || input.invoiceMonth === null) return input.occurredOn;

  return BusinessDate.fromParts(
    input.invoiceMonth.year,
    input.invoiceMonth.monthNumber,
    Math.min(input.planPurchaseOn.day, input.invoiceMonth.lastDay().day),
  );
}
