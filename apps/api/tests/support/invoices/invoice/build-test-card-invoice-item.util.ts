import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';

// A purchase of R$ 12,50 on 2026-10-15, with no category, no installment and not split.
// `overrides` replaces any field.
export function buildTestCardInvoiceItem(
  overrides: Partial<CardInvoiceTransactionReader.Item> = {},
): CardInvoiceTransactionReader.Item {
  return {
    transactionId: 'tx-1',
    description: 'Padaria',
    occurredOn: '2026-10-15',
    amountCents: -1250,
    nature: 'expense',
    categoryId: null,
    installment: null,
    parts: [],
    ...overrides,
  };
}
