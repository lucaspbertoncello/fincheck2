import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Invoice } from '#/modules/invoices/domain/invoice/invoice.entity.ts';
import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import { KyselyInvoiceRepository } from '#/modules/invoices/infra/invoice/invoice.repository.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';

describe('KyselyInvoiceRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let repository: KyselyInvoiceRepository;
  let card: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = new KyselyInvoiceRepository(database.db);
    card = await insertTestCreditCard(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const open = (month: string) =>
    Invoice.open(
      {
        accountId: card,
        month: Month.of(month),
        cycle: new InvoiceCycle(5, 12),
        calendar: new BusinessCalendar(),
      },
      NOW,
    );

  it('saves and finds the invoice with its dates, its correction, its payments and its dismissals', async () => {
    const debit = await insertTestTransaction(database.db, card, { method: 'credit' });
    const invoice = open('2026-11');
    invoice.correctTotal(
      { totalOverride: Money.fromCents(1234), overrideNote: 'juros' },
      'past',
      NOW,
    );
    invoice.registerPayment(
      { amount: Money.fromCents(500), paidOn: BusinessDate.of('2026-11-08'), transactionId: null },
      'past',
      NOW,
    );
    invoice.registerPayment(
      { amount: Money.fromCents(700), paidOn: BusinessDate.of('2026-11-09'), transactionId: debit },
      'past',
      NOW,
    );
    invoice.dismissPaymentSuggestion(debit, NOW);

    await repository.save(invoice);
    const found = await repository.findByAccountAndMonth(card, Month.of('2026-11'));

    expect(found).toMatchObject({
      id: invoice.id,
      accountId: card,
      closesOn: BusinessDate.of('2026-11-05'),
      dueOn: BusinessDate.of('2026-11-12'),
      totalOverride: Money.fromCents(1234),
      overrideNote: 'juros',
      bankTotal: null,
      dismissedTransactionIds: [debit],
    });
    expect(found?.payments.map((p) => [p.amount.cents, p.paidOn.value, p.transactionId])).toEqual([
      [500, '2026-11-08', null],
      [700, '2026-11-09', debit],
    ]);
  });

  it('updates a saved invoice: the payments and dismissals are replaced, the dates never change', async () => {
    const invoice = open('2026-11');
    const payment = invoice.registerPayment(
      { amount: Money.fromCents(500), paidOn: BusinessDate.of('2026-11-08'), transactionId: null },
      'past',
      NOW,
    );
    await repository.save(invoice);

    const loaded = (await repository.findByAccountAndMonth(card, Month.of('2026-11')))!;
    loaded.removePayment(payment.id, NOW);
    loaded.correctTotal({ totalOverride: Money.fromCents(0) }, 'past', NOW);
    await repository.save(loaded);

    const again = (await repository.findByAccountAndMonth(card, Month.of('2026-11')))!;
    expect(again.payments).toEqual([]);
    expect(again.totalOverride).toEqual(Money.fromCents(0));
    expect(again.closesOn.value).toBe('2026-11-05');
    expect(await repository.findByAccount(card)).toHaveLength(1);
  });

  it('finds by months and by card, and answers null for the month nobody wrote on', async () => {
    await repository.save(open('2026-10'));
    await repository.save(open('2026-11'));

    expect(await repository.findByAccountAndMonth(card, Month.of('2026-12'))).toBeNull();
    expect(
      (
        await repository.findByAccountAndMonths(card, [Month.of('2026-10'), Month.of('2026-12')])
      ).map((invoice) => invoice.month.value),
    ).toEqual(['2026-10']);
    expect(await repository.findByAccountAndMonths(card, [])).toEqual([]);
    expect(await repository.findByAccount(card)).toHaveLength(2);
  });

  it('says which transactions already pay an invoice', async () => {
    const paid = await insertTestTransaction(database.db, card, { method: 'credit' });
    const free = await insertTestTransaction(database.db, card, { method: 'credit' });
    const invoice = open('2026-11');
    invoice.registerPayment(
      { amount: Money.fromCents(100), paidOn: BusinessDate.of('2026-11-08'), transactionId: paid },
      'past',
      NOW,
    );
    await repository.save(invoice);

    expect(await repository.findLinkedTransactionIds([paid, free])).toEqual(new Set([paid]));
    expect(await repository.findLinkedTransactionIds([])).toEqual(new Set());
  });

  it('deletes the invoices of a card with their payments and dismissals, and only that card', async () => {
    const other = await insertTestCreditCard(database.db, { name: 'Outro' });
    const mine = open('2026-11');
    mine.registerPayment(
      { amount: Money.fromCents(100), paidOn: BusinessDate.of('2026-11-08'), transactionId: null },
      'past',
      NOW,
    );
    await repository.save(mine);
    await repository.save(
      Invoice.open(
        {
          accountId: other,
          month: Month.of('2026-11'),
          cycle: new InvoiceCycle(5, 12),
          calendar: new BusinessCalendar(),
        },
        NOW,
      ),
    );

    await repository.deleteByAccount(card);

    expect(await repository.findByAccount(card)).toEqual([]);
    expect(await repository.findByAccount(other)).toHaveLength(1);
    expect(await database.db.selectFrom('invoice_payments').select('id').execute()).toEqual([]);
  });
});
