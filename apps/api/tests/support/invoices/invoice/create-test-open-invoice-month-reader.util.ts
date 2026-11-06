import type { OpenInvoiceMonthReader } from '#/modules/transactions/application/installment-plan/open-invoice-month-reader.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// Stands for the `invoices` context in the tests of `transactions`: the open invoice of every card
// is always `month`.
export function createTestOpenInvoiceMonthReader(month: string): OpenInvoiceMonthReader {
  return {
    async openMonthsOf(accountIds) {
      return new Map(accountIds.map((accountId) => [accountId, Month.of(month)]));
    },
  };
}
