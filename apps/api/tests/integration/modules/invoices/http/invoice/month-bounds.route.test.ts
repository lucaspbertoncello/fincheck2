import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { createInvoiceTestWorld } from '#tests/support/invoices/invoice/create-invoice-test-world.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// A month or a date at the far ends of the month format made the neighbour month (the one before,
// the one after, a parcel) fall outside it and answered 500. The API accepts the years 2000 to 2100
// and answers 400 VALIDATION_FAILED outside them, and holds the list of invoices to 24 months even
// when only one side comes.
describe('the limits of the months the invoice routes accept', () => {
  let world: Awaited<ReturnType<typeof createInvoiceTestWorld>>;

  beforeEach(async () => {
    world = await createInvoiceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const refused = (response: Response) => world.expectError(response, 400, 'VALIDATION_FAILED');
  const base = (month: string) => `/cards/${world.card}/invoices/${month}`;

  describe('the month of the path', () => {
    it.each(['9999-12', '0001-01', '0001-02', '1999-12', '2101-01'])(
      'refuses %s on every route that takes it',
      async (month) => {
        const id = generateId();

        await refused(await world.send('GET', base(month)));
        await refused(await world.send('PATCH', base(month), { totalOverrideCents: 100 }));
        await refused(
          await world.send('POST', `${base(month)}/payments`, {
            amountCents: 100,
            paidOn: '2026-11-08',
          }),
        );
        await refused(await world.send('DELETE', `${base(month)}/payments/${id}`));
        await refused(
          await world.send('POST', `${base(month)}/payment-suggestion/dismiss`, {
            transactionId: id,
          }),
        );
        await refused(
          await world.send(
            'DELETE',
            `${base(month)}/payment-suggestion/dismiss?transactionId=${id}`,
          ),
        );
        expect(await world.database.db.selectFrom('invoices').select('id').execute()).toEqual([]);
      },
    );

    it('still answers the first and the last month it accepts', async () => {
      for (const month of ['2000-01', '2100-12']) {
        expect((await world.send('GET', base(month))).status).toBe(200);
      }
    });
  });

  describe('the list: from, to and the 24 months', () => {
    const list = (query: string) => world.send('GET', `/cards/${world.card}/invoices?${query}`);
    // The open invoice is 2026-12: the default range is 2026-10 to 2027-03.

    it('refuses a year outside 2000 to 2100 on either side', async () => {
      for (const query of ['to=9999-12', 'from=0001-01', 'from=1999-12&to=2000-06', 'to=2101-01']) {
        await refused(await list(query));
      }
    });

    it('holds the 24 months when only one side comes, using the default of the other', async () => {
      // 2020-01 up to the default 2027-03: 87 months. 2026-10 up to 2040-12: 171.
      for (const query of ['from=2020-01', 'to=2040-12', 'to=2024-12']) {
        await refused(await list(query));
      }
      // from after the default `to`.
      await refused(await list('from=2027-06'));
    });

    it('takes one side alone when the range is within the limit', async () => {
      const onlyFrom = await list('from=2026-10');
      const onlyTo = await list('to=2027-03');

      expect(onlyFrom.status).toBe(200);
      expect(onlyTo.status).toBe(200);
      expect(((await onlyFrom.json()) as { items: unknown[] }).items).toHaveLength(6);
    });

    it('takes exactly 24 months apart and refuses 25', async () => {
      expect((await list('from=2025-01&to=2027-01')).status).toBe(200);
      await refused(await list('from=2025-01&to=2027-02'));
    });
  });

  describe('a card purchase far from today', () => {
    const purchase = (occurredOn: string) =>
      world.send('POST', '/transactions', {
        type: 'expense',
        accountId: world.card,
        method: 'credit',
        description: 'Mercado',
        amountCents: 1000,
        occurredOn,
      });

    it('refuses a date outside the years, in creation and when the date moves, and stores nothing', async () => {
      for (const occurredOn of ['9999-12-31', '1999-12-31', '2101-01-01']) {
        await refused(await purchase(occurredOn));
      }
      const id = await insertTestTransaction(world.database.db, world.card, {
        method: 'credit',
        invoice_month: '2026-11',
      });
      await refused(await world.send('PATCH', `/transactions/${id}`, { occurredOn: '9999-12-31' }));

      expect(
        await world.database.db.selectFrom('transactions').select('id').execute(),
      ).toHaveLength(1);
    });

    it('still takes the last day of 2100 and the first of 2000', async () => {
      expect((await purchase('2100-12-31')).status).toBe(201);
      expect((await purchase('2000-01-01')).status).toBe(201);
    });

    it('does not look at the date of an account that is not a card', async () => {
      const response = await world.send('POST', '/transactions', {
        type: 'expense',
        accountId: world.checking,
        method: 'pix',
        description: 'Padaria',
        amountCents: 1000,
        occurredOn: '9999-12-31',
      });

      expect(response.status).toBe(201);
    });
  });

  describe('an installment plan that goes past 2100', () => {
    const plan = (firstInvoiceMonth: string, installmentCount: number) =>
      world.send('POST', '/installment-plans', {
        accountId: world.card,
        description: 'Cadeira',
        totalCents: 120000,
        installmentCount,
        firstInvoiceMonth,
        purchaseOn: '2026-11-05',
      });

    it('refuses the first month outside the years and a last parcel after 2100, and stores nothing', async () => {
      for (const [month, count] of [
        ['9999-06', 12],
        ['1999-12', 2],
        ['2101-01', 2],
        ['2100-06', 12],
        ['2100-12', 2],
      ] as const) {
        await refused(await plan(month, count));
      }

      expect(
        await world.database.db.selectFrom('installment_plans').select('id').execute(),
      ).toEqual([]);
      expect(await world.database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
    });

    it('takes a plan whose last parcel is the last month accepted', async () => {
      expect((await plan('2099-12', 13)).status).toBe(201);
      expect((await plan('2000-01', 12)).status).toBe(201);
    });
  });
});
