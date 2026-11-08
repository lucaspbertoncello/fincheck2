import type { Invoice } from '#/modules/invoices/domain/invoice/invoice.entity.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The port to the store of invoices: the root with its payments and dismissals. `Executor` is the
// database handle: pass the one of a unit of work to read and write inside it.
export interface InvoiceRepository<Executor> {
  findByAccountAndMonth(
    accountId: string,
    month: Month,
    executor?: Executor,
  ): Promise<Invoice | null>;
  // The ones that exist among `months`, in no particular order.
  findByAccountAndMonths(
    accountId: string,
    months: Month[],
    executor?: Executor,
  ): Promise<Invoice[]>;
  // Every invoice row of the card.
  findByAccount(accountId: string, executor?: Executor): Promise<Invoice[]>;
  // Which of the transactions already pay an invoice (any card).
  findLinkedTransactionIds(transactionIds: string[], executor?: Executor): Promise<Set<string>>;
  // Creates or updates the invoice, replacing its payments and its dismissals.
  save(invoice: Invoice, executor?: Executor): Promise<void>;
  // Deletes the invoices of a card (deleting the card); payments and dismissals go by `CASCADE`.
  deleteByAccount(accountId: string, executor?: Executor): Promise<void>;
}
