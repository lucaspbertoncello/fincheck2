import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';

import type { PaymentRegisterItem } from '#/features/bills/payment-register/payment-register.model.ts';

/**
 * A friend debt as the item the payment dialog takes, with the same key an agenda item of a bill
 * has (`bill:<id>`), so `?pay=` means the same on the Amigos tab and on A pagar e receber.
 */
export function billToPaymentItem(bill: Bill.Dto): PaymentRegisterItem {
  return {
    key: `bill:${bill.id}`,
    source: {
      type: 'bill',
      billId: bill.id,
      occurrenceId: null,
      recurrenceId: null,
      accountId: null,
      month: null,
    },
    title: bill.description,
    flow: bill.direction === 'receivable' ? 'in' : 'out',
    amountCents: bill.amountCents,
    paidCents: bill.paidCents,
    remainingCents: bill.remainingCents,
  };
}
