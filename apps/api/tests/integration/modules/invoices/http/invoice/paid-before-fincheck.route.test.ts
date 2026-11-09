import { agendaDtoSchema } from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { timelineDtoSchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { openInvoiceItemSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createInvoiceTestWorld } from '#tests/support/invoices/invoice/create-invoice-test-world.util.ts';
import { insertTestFirstSync } from '#tests/support/sync/connection/insert-test-first-sync.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// The card of the world closes on the 5th and is due on the 12th; "today" is 06/11/2026. The
// invoices 2026-09 (due 12/09), 2026-10 (due 12/10) and 2026-11 (due 12/11) all have purchases and
// no payment. An invoice due before the first round of the Pluggy connection was paid before the
// Fincheck existed (the app cannot know), so it is not a debt.
describe('invoices due before the first sync of the connection', () => {
  let world: Awaited<ReturnType<typeof createInvoiceTestWorld>>;

  beforeEach(async () => {
    world = await createInvoiceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const purchase = (card: string, month: string, cents: number) =>
    insertTestTransaction(world.database.db, card, {
      method: 'credit',
      invoice_month: month,
      amount_cents: -cents,
      occurred_on: `${month}-02`,
    });

  const seedThreeMonths = async (card = world.card) => {
    await purchase(card, '2026-09', 3000);
    await purchase(card, '2026-10', 4000);
    await purchase(card, '2026-11', 5000);
  };

  const payableMonths = async () => {
    const agenda = agendaDtoSchema.parse(
      await (await world.send('GET', '/agenda?month=2026-11')).json(),
    );
    const free = freeBalanceDtoSchema.parse(
      await (await world.send('GET', '/dashboard/free-balance')).json(),
    );

    return {
      agenda: agenda.payable.items.map((item) => item.source.month),
      agendaTotal: agenda.payable.totalCents,
      freeTotal: free.payable.totalCents,
    };
  };

  it('leaves the invoices due before the first round out of "A pagar" and the Livre, and keeps the later one', async () => {
    await seedThreeMonths();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-10-20T15:00:00.000Z',
    });

    const payable = await payableMonths();

    expect(payable.agenda).toEqual(['2026-11']);
    expect(payable.agendaTotal).toBe(5000);
    expect(payable.freeTotal).toBe(5000);
  });

  it('marks them paidBeforeFincheck, paid, with nothing left, and the card shows the next one to pay', async () => {
    await seedThreeMonths();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-10-20T15:00:00.000Z',
    });

    const old = await world.detailOf(
      await world.send('GET', `/cards/${world.card}/invoices/2026-10`),
    );
    const recent = await world.detailOf(
      await world.send('GET', `/cards/${world.card}/invoices/2026-11`),
    );
    const open = listResponseSchema(openInvoiceItemSchema).parse(
      await (await world.send('GET', '/invoices/open')).json(),
    );

    expect(old).toMatchObject({ status: 'paid', paidBeforeFincheck: true, remainingCents: 0 });
    expect(old.paidCents).toBe(0);
    expect(recent).toMatchObject({ status: 'closed', paidBeforeFincheck: false });
    expect(open.items[0]?.invoice).toMatchObject({ month: '2026-11', paidBeforeFincheck: false });
  });

  it('keeps an invoice due after the first round overdue', async () => {
    await seedThreeMonths();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-09-01T15:00:00.000Z',
    });

    const payable = await payableMonths();
    const old = await world.invoiceOf(
      await world.send('GET', `/cards/${world.card}/invoices/2026-10`),
    );

    expect(payable.agenda.toSorted()).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(old).toMatchObject({ status: 'overdue', paidBeforeFincheck: false });
  });

  it('does not change a manual card (no Pluggy link)', async () => {
    await seedThreeMonths();
    const other = await insertTestCreditCard(world.database.db, { name: 'Pluggy' });
    await insertTestFirstSync(world.database.db, {
      accountId: other,
      startedAt: '2026-10-20T15:00:00.000Z',
    });

    const payable = await payableMonths();
    const old = await world.invoiceOf(
      await world.send('GET', `/cards/${world.card}/invoices/2026-10`),
    );

    expect(payable.agenda.toSorted()).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(old).toMatchObject({ status: 'overdue', paidBeforeFincheck: false });
  });

  it('keeps a registered payment: the invoice stays paid by it, not by the rule', async () => {
    await seedThreeMonths();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-10-20T15:00:00.000Z',
    });
    await world.invoiceOf(
      await world.send('POST', `/cards/${world.card}/invoices/2026-10/payments`, {
        amountCents: 4000,
        paidOn: '2026-10-12',
      }),
      201,
    );

    const old = await world.invoiceOf(
      await world.send('GET', `/cards/${world.card}/invoices/2026-10`),
    );

    expect(old).toMatchObject({ status: 'paid', paidBeforeFincheck: false, paidCents: 4000 });
  });

  it('keeps a correction of the total from turning it back into a debt: it is still paid before the Fincheck', async () => {
    await seedThreeMonths();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-10-20T15:00:00.000Z',
    });
    await world.invoiceOf(
      await world.send('PATCH', `/cards/${world.card}/invoices/2026-10`, {
        totalOverrideCents: 4100,
      }),
    );

    const payable = await payableMonths();
    const old = await world.invoiceOf(
      await world.send('GET', `/cards/${world.card}/invoices/2026-10`),
    );

    expect(payable.agenda).toEqual(['2026-11']);
    expect(payable.freeTotal).toBe(5000);
    expect(old).toMatchObject({
      status: 'paid',
      paidBeforeFincheck: true,
      remainingCents: 0,
      totalCents: 4100,
    });
  });

  const projectedTitles = async () => {
    const timeline = timelineDtoSchema.parse(
      await (await world.send('GET', '/dashboard/timeline?month=2026-11')).json(),
    );

    return [
      ...timeline.overdue.map((item) => item.amountCents),
      ...timeline.undated.map((item) => item.amountCents),
      ...timeline.days.flatMap((day) => day.items.map((item) => item.amountCents)),
    ];
  };

  it('keeps the invoice paid before the Fincheck out of the projection, and keeps the one due after the first round in', async () => {
    await seedThreeMonths();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-10-20T15:00:00.000Z',
    });

    const amounts = await projectedTitles();

    // 2026-09 (3000) and 2026-10 (4000) fall due before the first round; 2026-11 (5000) after it.
    expect(amounts).toContain(5000);
    expect(amounts).not.toContain(3000);
    expect(amounts).not.toContain(4000);
  });

  it('keeps an old invoice in the projection when the first round came before its due date', async () => {
    await seedThreeMonths();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-09-01T15:00:00.000Z',
    });

    const amounts = await projectedTitles();

    expect(amounts).toEqual(expect.arrayContaining([3000, 4000, 5000]));
  });

  it('keeps the anchor when the sync trims the old rounds: it does not depend on the runs', async () => {
    await seedThreeMonths();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-10-20T15:00:00.000Z',
    });
    await world.database.db.deleteFrom('sync_runs').execute();

    const payable = await payableMonths();

    expect(payable.agenda).toEqual(['2026-11']);
  });

  it('keeps the anchor when the card is adopted by a new connection: what the app already followed is still pending', async () => {
    await seedThreeMonths();
    // The card was born in the first round (20/09), due 12/09 came before it. The item expired and
    // the card was adopted on 20/11 by a new connection: due 12/10 was followed by the app.
    await world.database.db
      .updateTable('accounts')
      .set({ source: 'pluggy', created_at: '2026-09-20T15:00:00.000Z' })
      .where('id', '=', world.card)
      .execute();
    await insertTestFirstSync(world.database.db, {
      accountId: world.card,
      startedAt: '2026-09-20T15:00:00.000Z',
    });
    const other = await insertTestCreditCard(world.database.db, { name: 'Outro' });
    const { connectionId } = await insertTestFirstSync(world.database.db, {
      accountId: other,
      startedAt: '2026-11-20T15:00:00.000Z',
    });
    await world.database.db
      .deleteFrom('sync_account_links')
      .where('account_id', '=', other)
      .execute();
    await world.database.db
      .updateTable('sync_account_links')
      .set({ connection_id: connectionId })
      .where('account_id', '=', world.card)
      .execute();

    const payable = await payableMonths();

    expect(payable.agenda.toSorted()).toEqual(['2026-10', '2026-11']);
  });
});
