import type { Month } from '#/shared/date/month.value-object.ts';

// Where the month of an invoice stands against the open one: already `past` (closed, to pay or
// paid), the `current` open one, or a `projected` one that has not opened yet (RF-INV-003).
export type InvoicePhase = 'past' | 'current' | 'projected';

export function computeInvoicePhase(month: Month, openMonth: Month): InvoicePhase {
  if (month.value > openMonth.value) return 'projected';

  return month.equals(openMonth) ? 'current' : 'past';
}
