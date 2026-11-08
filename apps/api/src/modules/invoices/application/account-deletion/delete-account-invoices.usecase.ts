import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { UnlinkInvoicePaymentTransaction } from '#/modules/invoices/application/invoice-payment/unlink-invoice-payment-transaction.interface.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';

// Deletes the invoices of a card, inside the unit of work of the deletion of the account (BR-ACC-008).
// The payments and the dismissals fall with them. The transactions that paid them (debits of other
// accounts) are not lost: `transactions` gives each one back its place, the way the undo of a
// payment does. Satisfies the `DeleteAccountInvoices` port of `accounts`.
export class DeleteAccountInvoicesUseCase {
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly unlinkTransaction: UnlinkInvoicePaymentTransaction;

  constructor(
    invoices: InvoiceRepository<Kysely<Database>>,
    unlinkTransaction: UnlinkInvoicePaymentTransaction,
  ) {
    this.invoices = invoices;
    this.unlinkTransaction = unlinkTransaction;
  }

  async execute(accountId: string, executor: Kysely<Database>): Promise<void> {
    const rows = await this.invoices.findByAccount(accountId, executor);
    const transactionIds = rows.flatMap((row) =>
      row.payments.flatMap((payment) => payment.transactionId ?? []),
    );

    for (const transactionId of transactionIds) {
      await this.unlinkTransaction.execute(transactionId, executor);
    }
    await this.invoices.deleteByAccount(accountId, executor);
  }
}
