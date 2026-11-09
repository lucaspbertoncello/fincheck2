import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTransactionsInvoicePorts } from '#/main/http/create-transactions-invoice-ports.util.ts';
import { GetAccountRefQuery } from '#/modules/accounts/application/account/get-account-ref.query.ts';
import { GetCardRefsQuery } from '#/modules/accounts/application/account/get-card-refs.query.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { ListPayableInvoicesQuery } from '#/modules/invoices/application/bank-invoice/list-payable-invoices.query.ts';
import { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import { KyselyInvoiceRepository } from '#/modules/invoices/infra/invoice/invoice.repository.ts';
import { GetFirstSyncDatesQuery } from '#/modules/sync/application/run/get-first-sync-dates.query.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestFirstSync } from '#tests/support/sync/connection/insert-test-first-sync.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// The detector of invoice payments of the import compares a bank debit to the invoices still to pay.
// An invoice due before the first round of the connection is "paid before the Fincheck" for Lucas
// (it is not a debt), but the debit that paid it is in the history the first round brings: the
// detector must still see it as an invoice to match, or that debit would count as spending twice.
describe('ListPayableInvoicesQuery with invoices due before the first sync', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let query: ListPayableInvoicesQuery;
  let card: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    card = await insertTestCreditCard(database.db);
    const accounts = new KyselyAccountRepository(database.db);
    const clock = createFixedClock('2026-11-06T15:00:00.000Z');
    const ports = createTransactionsInvoicePorts({
      db: database.db,
      accounts: new GetAccountRefQuery(accounts),
      clock,
    });
    const invoices = new KyselyInvoiceRepository(database.db);
    const builder = new InvoiceDtoBuilder(
      invoices,
      ports.cardTransactions,
      ports.paymentTransactions,
      ports.paymentCandidates,
      undefined,
      new BusinessCalendar(),
      clock,
      undefined,
      new GetFirstSyncDatesQuery(database.db),
    );
    query = new ListPayableInvoicesQuery(
      new GetCardRefsQuery(accounts),
      invoices,
      ports.cardTransactions,
      builder,
    );
    await insertTestTransaction(database.db, card, {
      method: 'credit',
      invoice_month: '2026-10',
      amount_cents: -4000,
      occurred_on: '2026-10-02',
    });
    await insertTestFirstSync(database.db, {
      accountId: card,
      startedAt: '2026-10-20T15:00:00.000Z',
    });
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('still lists the invoice paid before the Fincheck, so the debit that paid it is recognised', async () => {
    const found = await query.execute();

    expect(found.map((invoice) => [invoice.dueOn, invoice.totalCents])).toEqual([
      ['2026-10-13', 4000],
    ]);
  });
});
