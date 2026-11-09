import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { RecordBankInvoiceTotalsUseCase } from '#/modules/invoices/application/bank-invoice/record-bank-invoice-totals.usecase.ts';
import { InvoiceOpener } from '#/modules/invoices/application/invoice/invoice-opener.service.ts';
import { KyselyInvoiceRepository } from '#/modules/invoices/infra/invoice/invoice.repository.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const clock = createFixedClock('2026-11-09T15:00:00.000Z');

describe('RecordBankInvoiceTotalsUseCase', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let unitOfWork: KyselyUnitOfWork;
  let useCase: RecordBankInvoiceTotalsUseCase;

  beforeEach(async () => {
    database = await createTestDatabase();
    unitOfWork = new KyselyUnitOfWork(database.db);
    const calendar = new BusinessCalendar();
    const invoices = new KyselyInvoiceRepository(database.db);
    const cards = {
      async findCard(accountId: string, executor = database.db) {
        const row = await executor
          .selectFrom('accounts')
          .innerJoin('credit_cards', 'credit_cards.account_id', 'accounts.id')
          .select([
            'accounts.id',
            'credit_cards.closing_day',
            'credit_cards.due_day',
            'accounts.archived_at',
          ])
          .where('accounts.id', '=', accountId)
          .executeTakeFirst();

        return row
          ? {
              id: row.id,
              closingDay: row.closing_day,
              dueDay: row.due_day,
              isArchived: row.archived_at !== null,
            }
          : null;
      },
      async findCards() {
        return new Map();
      },
      async listActiveCards() {
        return [];
      },
    };
    useCase = new RecordBankInvoiceTotalsUseCase(
      cards,
      invoices,
      new InvoiceOpener(invoices, calendar),
      calendar,
      clock,
    );
  });

  afterEach(async () => {
    await database.destroy();
  });

  const record = (accountId: string, bills: { dueOn: string; totalCents: number }[]) =>
    unitOfWork.run((executor) => useCase.execute({ accountId, bills }, executor));
  const invoices = () => database.db.selectFrom('invoices').selectAll().orderBy('month').execute();

  it('puts the total of each closed invoice on the invoice of the cycle that has that due date, born when it did not exist', async () => {
    const card = await insertTestCreditCard(database.db);

    const answer = await record(card, [
      { dueOn: '2026-11-12', totalCents: 5000 },
      { dueOn: '2026-12-14', totalCents: 7000 },
    ]);

    expect(answer.recordedCount).toBe(2);
    expect(
      (await invoices()).map((row) => [row.month, row.closes_on, row.due_on, row.bank_total_cents]),
    ).toEqual([
      ['2026-11', '2026-11-05', '2026-11-12', 5000],
      ['2026-12', '2026-12-05', '2026-12-14', 7000],
    ]);
  });

  it('the same totals again record nothing (idempotency); a new total replaces the old', async () => {
    const card = await insertTestCreditCard(database.db);
    await record(card, [{ dueOn: '2026-11-12', totalCents: 5000 }]);

    expect((await record(card, [{ dueOn: '2026-11-12', totalCents: 5000 }])).recordedCount).toBe(0);
    expect((await record(card, [{ dueOn: '2026-11-12', totalCents: 6000 }])).recordedCount).toBe(1);
    expect((await invoices())[0]?.bank_total_cents).toBe(6000);
  });

  it('never touches the correction of Lucas', async () => {
    const card = await insertTestCreditCard(database.db);
    await record(card, [{ dueOn: '2026-11-12', totalCents: 5000 }]);
    await database.db
      .updateTable('invoices')
      .set({ total_override_cents: 4000, override_note: 'estorno' })
      .execute();

    await record(card, [{ dueOn: '2026-11-12', totalCents: 5500 }]);

    expect((await invoices())[0]).toMatchObject({
      bank_total_cents: 5500,
      total_override_cents: 4000,
      override_note: 'estorno',
    });
  });

  it('a bill whose due date fits no month of the cycle is left out, not guessed', async () => {
    const card = await insertTestCreditCard(database.db);

    const answer = await record(card, [{ dueOn: '2026-11-28', totalCents: 5000 }]);

    expect(answer.recordedCount).toBe(0);
    expect(await invoices()).toEqual([]);
  });

  it('an archived card and an account that is not a card are left alone', async () => {
    const archived = await insertTestCreditCard(database.db, {
      archived_at: '2026-10-01T00:00:00.000Z',
    });
    const checking = await insertTestAccount(database.db);

    expect((await record(archived, [{ dueOn: '2026-11-12', totalCents: 1 }])).recordedCount).toBe(
      0,
    );
    expect((await record(checking, [{ dueOn: '2026-11-12', totalCents: 1 }])).recordedCount).toBe(
      0,
    );
    expect((await record('missing', [{ dueOn: '2026-11-12', totalCents: 1 }])).recordedCount).toBe(
      0,
    );
  });
});
