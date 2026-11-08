import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTransactionsInvoicePorts } from '#/main/http/create-transactions-invoice-ports.util.ts';
import { GetCardRefsQuery } from '#/modules/accounts/application/account/get-card-refs.query.ts';
import { GetAccountRefQuery } from '#/modules/accounts/application/account/get-account-ref.query.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import type { RecurrenceExpectationReader } from '#/modules/invoices/application/invoice/recurrence-expectation-reader.interface.ts';
import { KyselyInvoiceRepository } from '#/modules/invoices/infra/invoice/invoice.repository.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// The recurrences are not built yet (piece 6): their reader is a double that answers what the
// contract says, to prove that the total, the lines and the next invoice use it, and only while
// the invoice has not closed.
describe('InvoiceDtoBuilder with the recurrences foreseen on the card', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let card: Awaited<ReturnType<GetCardRefsQuery['findCard']>>;
  let builder: InvoiceDtoBuilder;

  const expectations: RecurrenceExpectationReader = {
    async expectationsOf(_accountId, months) {
      const all = new Map([
        [
          '2026-11',
          [
            {
              occurrenceId: 'o1',
              recurrenceName: 'Netflix',
              expectedOn: '2026-11-21',
              amountCents: 5590,
            },
          ],
        ],
        [
          '2026-12',
          [
            {
              occurrenceId: 'o2',
              recurrenceName: 'Netflix',
              expectedOn: '2026-12-21',
              amountCents: 5590,
            },
            { occurrenceId: 'o3', recurrenceName: 'Celular', expectedOn: null, amountCents: 5499 },
          ],
        ],
      ]);

      return new Map([...all].filter(([month]) => months.some((m) => m.value === month)));
    },
  };

  beforeEach(async () => {
    database = await createTestDatabase();
    const accountId = await insertTestCreditCard(database.db);
    const accounts = new KyselyAccountRepository(database.db);
    card = await new GetCardRefsQuery(accounts).findCard(accountId);
    const clock = createFixedClock('2026-11-06T15:00:00.000Z');
    const ports = createTransactionsInvoicePorts({
      db: database.db,
      accounts: new GetAccountRefQuery(accounts),
      clock,
    });
    builder = new InvoiceDtoBuilder(
      new KyselyInvoiceRepository(database.db),
      ports.cardTransactions,
      ports.paymentTransactions,
      ports.paymentCandidates,
      expectations,
      new BusinessCalendar(),
      clock,
    );
    await insertTestTransaction(database.db, accountId, {
      method: 'credit',
      invoice_month: '2026-11',
      amount_cents: -10000,
    });
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('adds the expected recurrences to the open and the projected invoices, and not to a closed one', async () => {
    // Today is 06/11 and the card closes on the 5th: November is closed, December is the open one.
    const [november, december] = await builder.buildMany(card!, [
      Month.of('2026-11'),
      Month.of('2026-12'),
    ]);

    expect(november).toMatchObject({
      status: 'closed',
      breakdown: { purchasesCents: 10000, expectedRecurringCents: 0 },
      totalCents: 10000,
    });
    expect(december).toMatchObject({
      status: 'open',
      breakdown: { purchasesCents: 0, expectedRecurringCents: 11089 },
      computedTotalCents: 11089,
      totalCents: 11089,
      remainingCents: 11089,
    });
  });

  it('shows the expected recurrences as lines of the open invoice, the one with no date last, and counts them in the invoice before', async () => {
    const detail = await builder.buildDetail(card!, Month.of('2026-12'));

    expect(detail.items).toEqual([
      {
        type: 'expected_recurrence',
        occurrenceId: 'o2',
        recurrenceName: 'Netflix',
        expectedOn: '2026-12-21',
        amountCents: 5590,
      },
      {
        type: 'expected_recurrence',
        occurrenceId: 'o3',
        recurrenceName: 'Celular',
        expectedOn: null,
        amountCents: 5499,
      },
    ]);
    // The total of the month before is what that invoice shows (closed: no expected recurrence).
    expect(detail.previousTotalCents).toBe(10000);
  });

  it('counts what the next invoice already has: its parcels and its recurrences (BR-INV-006)', async () => {
    const november = await builder.buildDetail(card!, Month.of('2026-11'));

    // December has no parcel yet, and 55,90 + 54,99 expected.
    expect(november.nextInvoiceCommittedCents).toBe(11089);
    expect(november.items).toHaveLength(1);
  });
});
