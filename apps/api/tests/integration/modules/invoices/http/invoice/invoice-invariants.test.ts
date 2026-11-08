import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { invoiceDtoSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createInvoiceTestWorld } from '#tests/support/invoices/invoice/create-invoice-test-world.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const MONTHS = ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];

// A small deterministic generator (the same numbers on every run).
function createRandom(seed: number) {
  let state = seed;

  return (maximum: number) => {
    state = (state * 1664525 + 1013904223) % 4294967296;

    return state % maximum;
  };
}

type Generated = { month: string; cents: number; isParcel: boolean; counts: boolean };

describe('invoice invariants', () => {
  let world: Awaited<ReturnType<typeof createInvoiceTestWorld>>;

  beforeEach(async () => {
    world = await createInvoiceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  // Fills the card with random purchases, refunds, parcels, ignored ones and the payment of an
  // invoice, and some payments by hand; returns what each month must add up to.
  async function fillCard(seed: number) {
    const random = createRandom(seed);
    const plan = await insertTestInstallmentPlan(world.database.db, world.card);
    const generated: Generated[] = [];
    let parcel = 0;

    for (let index = 0; index < 60; index++) {
      const month = MONTHS[random(MONTHS.length)]!;
      const kind = random(10);
      // Money: a purchase is negative, a refund (kind 0) positive.
      const cents = (kind === 0 ? 1 : -1) * (1 + random(50000));
      const isParcel = kind === 1 || kind === 2;
      const ignored = kind === 3;
      const isPayment = kind === 4;
      await insertTestTransaction(world.database.db, world.card, {
        method: 'credit',
        invoice_month: month,
        amount_cents: cents,
        occurred_on: `${month}-0${String(1 + random(8))}`,
        ...(isPayment ? { nature: 'invoice_payment' as const } : {}),
        ...(ignored ? { ignored_at: '2026-11-01T00:00:00.000Z' } : {}),
        ...(isParcel ? { installment_plan_id: plan, installment_number: ++parcel } : {}),
      });
      generated.push({ month, cents, isParcel, counts: !ignored && !isPayment });
    }

    const paidByMonth = new Map<string, number>();
    for (const month of MONTHS.slice(0, 4)) {
      if (random(2) === 0) continue;
      const amount = 1 + random(80000);
      await world.send('POST', `/cards/${world.card}/invoices/${month}/payments`, {
        amountCents: amount,
        paidOn: `${month}-10`,
      });
      paidByMonth.set(month, amount);
    }

    return { generated, paidByMonth };
  }

  it.each([1, 7, 42, 2026])(
    'the total is the sum of the purchases and parcels of the cycle, and what is left is the total minus what is paid (seed %i)',
    async (seed) => {
      const { generated, paidByMonth } = await fillCard(seed);

      const response = await world.send(
        'GET',
        `/cards/${world.card}/invoices?from=2026-08&to=2027-01`,
      );
      const { items } = listResponseSchema(invoiceDtoSchema).parse(await response.json());

      expect(items.map((item) => item.month)).toEqual(MONTHS);
      for (const invoice of items) {
        const own = generated.filter((entry) => entry.month === invoice.month && entry.counts);
        const purchases = own
          .filter((entry) => !entry.isParcel)
          .reduce((sum, entry) => sum - entry.cents, 0);
        const installments = own
          .filter((entry) => entry.isParcel)
          .reduce((sum, entry) => sum - entry.cents, 0);
        const paid = paidByMonth.get(invoice.month) ?? 0;

        expect(invoice.breakdown.purchasesCents).toBe(purchases);
        expect(invoice.breakdown.installmentsCents).toBe(installments);
        expect(invoice.computedTotalCents).toBe(purchases + installments);
        expect(invoice.totalCents).toBe(invoice.computedTotalCents);
        expect(invoice.paidCents).toBe(paid);
        expect(invoice.remainingCents).toBe(Math.max(0, invoice.totalCents - paid));
        expect(invoice.presumedPaidCents).toBe(0);
        // The payments listed add up to what is paid, one by one.
        expect(invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0)).toBe(paid);
        if (invoice.status === 'paid') expect(paid).toBeGreaterThanOrEqual(invoice.totalCents);
        if (
          invoice.status === 'partial' ||
          invoice.status === 'closed' ||
          invoice.status === 'open'
        ) {
          expect(paid).toBeLessThan(Math.max(invoice.totalCents, 1));
        }
      }
    },
  );

  it('the lines of the page add up to the total of the invoice, and the composition to the spending', async () => {
    await fillCard(99);

    for (const month of MONTHS) {
      const detail = await world.detailOf(
        await world.send('GET', `/cards/${world.card}/invoices/${month}`),
      );
      const lines = detail.items.reduce(
        (sum, item) => (item.type === 'transaction' ? sum - item.amountCents : sum),
        0,
      );

      expect(lines).toBe(detail.computedTotalCents);
      // Every line of the composition is spending of one or more of the lines.
      const share = detail.categoryBreakdown.reduce((sum, entry) => sum + entry.totalCents, 0);
      const spending = detail.items.reduce(
        (sum, item) => (item.type === 'transaction' ? sum - item.amountCents : sum),
        0,
      );
      expect(share).toBeLessThanOrEqual(Math.max(spending, 0) + 0);
      for (const entry of detail.categoryBreakdown) {
        expect(entry.totalCents).toBeGreaterThan(0);
        expect(entry.sharePercent).toBeGreaterThan(0);
        expect(entry.sharePercent).toBeLessThanOrEqual(100);
      }
    }
  });

  it('the list and the detail of a month answer the same invoice', async () => {
    await fillCard(5);

    const { items } = listResponseSchema(invoiceDtoSchema).parse(
      await (
        await world.send('GET', `/cards/${world.card}/invoices?from=2026-08&to=2027-01`)
      ).json(),
    );
    for (const invoice of items) {
      const detail = await world.detailOf(
        await world.send('GET', `/cards/${world.card}/invoices/${invoice.month}`),
      );
      // The schema of the invoice drops the fields only the page has.
      expect(invoiceDtoSchema.parse(detail)).toEqual(invoice);
    }
  });
});
