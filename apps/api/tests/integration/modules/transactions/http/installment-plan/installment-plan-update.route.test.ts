import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { installmentPlanDtoSchema } from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestInstallmentPlan } from '#tests/support/transactions/installment-plan/insert-test-installment-plan.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const ARCHIVED_AT = '2026-10-01T00:00:00.000Z';

type PlanDto = InstallmentPlan.Dto;

const linkToBillName = 'bill';
const linkToOccurrenceName = 'occurrence';

// `PATCH /installment-plans/:id` on the real app of `main` (every module wired, a real SQLite file).
// The clock is 2026-11-06 (Sao Paulo): the test card closes on the 5th, so the OPEN invoice is 2026-12.
// The base plan is R$ 1.299,00 in 12 from 2026-12, bought on 2026-11-05.
describe('PATCH /installment-plans/:id (real app)', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;
  let cardId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
    cardId = await insertTestCreditCard(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });

  const expectError = async (response: Response, status: number, code: string) => {
    expect(response.status).toBe(status);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
  };

  const createPlan = async (overrides: Record<string, unknown> = {}): Promise<PlanDto> => {
    const response = await send('POST', '/installment-plans', {
      accountId: cardId,
      description: 'Cadeira ergonômica',
      totalCents: 129900,
      installmentCount: 12,
      firstInvoiceMonth: '2026-12',
      purchaseOn: '2026-11-05',
      ...overrides,
    });
    expect(response.status).toBe(201);

    return installmentPlanDtoSchema.parse(await response.json());
  };

  const patch = (planId: string, body: unknown) =>
    send('PATCH', `/installment-plans/${planId}`, body);

  const patchOk = async (planId: string, body: unknown): Promise<PlanDto> => {
    const response = await patch(planId, body);
    expect(response.status).toBe(200);

    return installmentPlanDtoSchema.parse(await response.json());
  };

  const getPlan = async (planId: string): Promise<PlanDto> => {
    const response = await send('GET', '/installment-plans');
    const body = (await response.json()) as { items: unknown[] };
    const found = body.items
      .map((item) => installmentPlanDtoSchema.parse(item))
      .find((plan) => plan.id === planId);
    if (!found) throw new Error('Plan not listed');

    return found;
  };

  const parcelRows = (planId: string) =>
    database.db
      .selectFrom('transactions')
      .selectAll()
      .where('installment_plan_id', '=', planId)
      .orderBy('installment_number', 'asc')
      .execute();

  const planRow = (planId: string) =>
    database.db
      .selectFrom('installment_plans')
      .selectAll()
      .where('id', '=', planId)
      .executeTakeFirstOrThrow();

  const tagsOf = async (transactionId: string) =>
    (
      await database.db
        .selectFrom('transaction_tags')
        .select('tag_id')
        .where('transaction_id', '=', transactionId)
        .execute()
    )
      .map((row) => row.tag_id)
      .sort();

  // What the DB holds for a plan: to check that a refused edit wrote nothing.
  const snapshot = async (planId: string) => ({
    plan: await planRow(planId),
    parcels: (await parcelRows(planId)).map((row) => ({
      id: row.id,
      number: row.installment_number,
      amount: row.amount_cents,
      month: row.invoice_month,
      on: row.occurred_on,
      description: row.description,
      category: row.category_id,
      updatedAt: row.updated_at,
    })),
  });

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

  // The parcels always add up to the total of the plan, in the DTO and in the rows.
  const expectSumsToTotal = async (plan: PlanDto) => {
    expect(plan.installments).toHaveLength(plan.installmentCount);
    expect(sum(plan.installments.map((item) => item.amountCents))).toBe(plan.totalCents);
    const rows = await parcelRows(plan.id);
    expect(rows).toHaveLength(plan.installmentCount);
    expect(sum(rows.map((row) => -row.amount_cents))).toBe(plan.totalCents);
    const row = await planRow(plan.id);
    expect(row).toMatchObject({
      total_cents: plan.totalCents,
      installment_count: plan.installmentCount,
    });
  };

  // The total of the invoices of the card by month, as the invoice route computes it.
  const invoiceTotals = async (from: string, to: string) => {
    const response = await send('GET', `/cards/${cardId}/invoices?from=${from}&to=${to}`);
    expect(response.status).toBe(200);
    const { items } = (await response.json()) as {
      items: { month: string; breakdown: { installmentsCents: number } }[];
    };

    return Object.fromEntries(items.map((item) => [item.month, item.breakdown.installmentsCents]));
  };

  const monthExpenses = async (month: string) => {
    const response = await send('GET', `/transactions/summary?month=${month}`);
    expect(response.status).toBe(200);

    return ((await response.json()) as { expensesCents: number }).expensesCents;
  };

  // An invoice of the card with a payment registered on it (by hand, no transaction).
  const payInvoice = async (month: string) => {
    const invoiceId = generateId();
    await database.db
      .insertInto('invoices')
      .values({
        id: invoiceId,
        account_id: cardId,
        month,
        closes_on: `${month}-05`,
        due_on: `${month}-12`,
        bank_total_cents: null,
        total_override_cents: null,
        override_note: null,
        created_at: NOW,
        updated_at: NOW,
      })
      .execute();
    await database.db
      .insertInto('invoice_payments')
      .values({
        id: generateId(),
        invoice_id: invoiceId,
        transaction_id: null,
        amount_cents: 5000,
        paid_on: `${month}-12`,
        created_at: NOW,
      })
      .execute();
  };

  const linkToBill = async (transactionId: string) => {
    const billId = generateId();
    await database.db
      .insertInto('bills')
      .values({
        id: billId,
        direction: 'payable',
        kind: 'general',
        description: 'Conta',
        counterparty: null,
        amount_cents: 5000,
        due_on: null,
        category_id: null,
        origin_transaction_id: null,
        created_at: NOW,
        updated_at: NOW,
      })
      .execute();
    await database.db
      .insertInto('bill_payments')
      .values({
        id: generateId(),
        bill_id: billId,
        transaction_id: transactionId,
        amount_cents: 5000,
        paid_on: '2026-11-05',
        created_at: NOW,
      })
      .execute();
  };

  const linkToOccurrence = async (transactionId: string) => {
    const recurrenceId = generateId();
    const occurrenceId = generateId();
    await database.db
      .insertInto('recurrences')
      .values({
        id: recurrenceId,
        kind: 'expense',
        name: 'Assinatura',
        expected_amount_cents: 5000,
        amount_mode: 'fixed',
        counterparty: null,
        match_text: null,
        account_id: cardId,
        method: null,
        category_id: null,
        date_rule: 'any_day',
        day: null,
        business_day_number: null,
        tolerance_days: null,
        non_business_day_shift: null,
        employment_regime: null,
        is_subscription: 0,
        service_slug: null,
        max_payments: 1,
        starts_month: '2026-12',
        paused_at: null,
        archived_at: null,
        created_at: NOW,
        updated_at: NOW,
      })
      .execute();
    await database.db
      .insertInto('recurrence_occurrences')
      .values({
        id: occurrenceId,
        recurrence_id: recurrenceId,
        month: '2026-12',
        expected_on: null,
        window_start_on: '2026-12-01',
        window_end_on: '2026-12-31',
        expected_amount_cents: 5000,
        settled_at: null,
        skipped_at: null,
        difference_decision: null,
        created_at: NOW,
        updated_at: NOW,
      })
      .execute();
    await database.db
      .insertInto('occurrence_payments')
      .values({
        id: generateId(),
        occurrence_id: occurrenceId,
        transaction_id: transactionId,
        amount_cents: 5000,
        linked_by: 'user',
        created_at: NOW,
      })
      .execute();
  };

  const splitParcel = async (transactionId: string, amountCents: number) => {
    const part = Math.floor(amountCents / 2);
    await database.db
      .insertInto('transaction_splits')
      .values([
        {
          id: generateId(),
          transaction_id: transactionId,
          position: 1,
          amount_cents: -part,
          nature: 'expense',
          category_id: null,
          description: null,
        },
        {
          id: generateId(),
          transaction_id: transactionId,
          position: 2,
          amount_cents: -(amountCents - part),
          nature: 'expense',
          category_id: null,
          description: null,
        },
      ])
      .execute();
  };

  describe('each field', () => {
    it('changes the description of the plan and of every parcel, trimmed', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      const updated = await patchOk(plan.id, { description: '  Poltrona  ' });

      expect(updated).toMatchObject({ description: 'Poltrona', totalCents: 30000 });
      expect((await planRow(plan.id)).description).toBe('Poltrona');
      expect((await parcelRows(plan.id)).map((row) => row.description)).toEqual([
        'Poltrona',
        'Poltrona',
        'Poltrona',
      ]);
      expect(updated.installments.map((item) => item.amountCents)).toEqual([10000, 10000, 10000]);
      expect((await planRow(plan.id)).updated_at).toBe(NOW);
    });

    it('changes the total: every parcel takes the new share, the first one the leftover cents', async () => {
      const plan = await createPlan();
      const ids = plan.installments.map((item) => item.transactionId);

      // R$ 1.000,00 in 12 is 8333 x 11 and 8337 in the first (4 cents left over).
      const updated = await patchOk(plan.id, { totalCents: 100000 });

      expect(updated.totalCents).toBe(100000);
      expect(updated.installments.map((item) => item.amountCents)).toEqual([
        8337,
        ...Array<number>(11).fill(8333),
      ]);
      expect(updated.installments.map((item) => item.transactionId)).toEqual(ids);
      await expectSumsToTotal(updated);
      for (const row of await parcelRows(plan.id)) {
        expect(row.amount_cents).toBeLessThan(0);
        expect(row).toMatchObject({ nature: 'expense', method: 'credit', origin: 'manual' });
      }
    });

    it('answers the same Dto as the list', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      const updated = await patchOk(plan.id, { totalCents: 45000 });

      expect(updated).toEqual(await getPlan(plan.id));
      expect(updated).toMatchObject({
        nextInstallment: { number: 1, invoiceMonth: '2026-12', amountCents: 15000 },
        remainingCents: 45000,
      });
    });

    it('raises the count: the first parcels keep their ids, the new ones are created at the end', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const ids = plan.installments.map((item) => item.transactionId);

      const updated = await patchOk(plan.id, { installmentCount: 5 });

      expect(updated.installmentCount).toBe(5);
      expect(updated.installments.map((item) => item.number)).toEqual([1, 2, 3, 4, 5]);
      expect(updated.installments.slice(0, 3).map((item) => item.transactionId)).toEqual(ids);
      expect(updated.installments.map((item) => item.amountCents)).toEqual(Array(5).fill(6000));
      expect(updated.installments.map((item) => item.invoiceMonth)).toEqual([
        '2026-12',
        '2027-01',
        '2027-02',
        '2027-03',
        '2027-04',
      ]);
      expect(updated.installments.map((item) => item.occurredOn)).toEqual([
        '2026-12-05',
        '2027-01-05',
        '2027-02-05',
        '2027-03-05',
        '2027-04-05',
      ]);
      expect(new Set(updated.installments.map((item) => item.transactionId)).size).toBe(5);
      await expectSumsToTotal(updated);
      expect(await parcelRows(plan.id)).toSatisfy((rows: { origin: string }[]) =>
        rows.every((row) => row.origin === 'manual'),
      );
    });

    it('lowers the count: the last parcels go, with their tags, and the others keep their ids', async () => {
      const food = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db, { category_id: food });
      const plan = await createPlan({
        totalCents: 40000,
        installmentCount: 4,
        categoryId: food,
        tagIds: [tag],
      });
      const ids = plan.installments.map((item) => item.transactionId);

      const updated = await patchOk(plan.id, { installmentCount: 2 });

      expect(updated.installments.map((item) => item.transactionId)).toEqual(ids.slice(0, 2));
      expect(updated.installments.map((item) => item.amountCents)).toEqual([20000, 20000]);
      await expectSumsToTotal(updated);
      const gone = await database.db
        .selectFrom('transactions')
        .select('id')
        .where('id', 'in', ids.slice(2))
        .execute();
      expect(gone).toEqual([]);
      const orphanTags = await database.db
        .selectFrom('transaction_tags')
        .select('transaction_id')
        .where('transaction_id', 'in', ids.slice(2))
        .execute();
      expect(orphanTags).toEqual([]);
      expect(await tagsOf(ids[0] ?? '')).toEqual([tag]);
      expect(await tagsOf(ids[1] ?? '')).toEqual([tag]);
    });

    it('R$ 1.299,00 in 12 is 12 x R$ 108,25; down to 11 and up to 13 the sum is still R$ 1.299,00', async () => {
      const plan = await createPlan();
      expect(new Set(plan.installments.map((item) => item.amountCents))).toEqual(new Set([10825]));

      const down = await patchOk(plan.id, { installmentCount: 11 });
      expect(down.installments.map((item) => item.amountCents)).toEqual([
        11810,
        ...Array<number>(10).fill(11809),
      ]);
      await expectSumsToTotal(down);

      const up = await patchOk(plan.id, { installmentCount: 13 });
      expect(up.installments.map((item) => item.amountCents)).toEqual([
        9996,
        ...Array<number>(12).fill(9992),
      ]);
      await expectSumsToTotal(up);

      const back = await patchOk(plan.id, { installmentCount: 12 });
      expect(new Set(back.installments.map((item) => item.amountCents))).toEqual(new Set([10825]));
      await expectSumsToTotal(back);
    });

    it('changes total and count together and the parcels always add up to the total', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      for (const [totalCents, installmentCount] of [
        [99999, 7],
        [48, 48],
        [100001, 2],
        [100, 13],
        [30000, 3],
      ] as const) {
        const updated = await patchOk(plan.id, { totalCents, installmentCount });

        expect(updated).toMatchObject({ totalCents, installmentCount });
        await expectSumsToTotal(updated);
        expect(Math.min(...updated.installments.map((item) => item.amountCents))).toBeGreaterThan(
          0,
        );
      }
    });

    it('moves the first invoice: every parcel changes invoice and date, keeping its id', async () => {
      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        purchaseOn: '2026-10-31',
      });
      const ids = plan.installments.map((item) => item.transactionId);

      const updated = await patchOk(plan.id, { firstInvoiceMonth: '2027-01' });

      expect(updated.firstInvoiceMonth).toBe('2027-01');
      expect(updated.installments.map((item) => item.transactionId)).toEqual(ids);
      expect(updated.installments.map((item) => item.invoiceMonth)).toEqual([
        '2027-01',
        '2027-02',
        '2027-03',
      ]);
      // The purchase was on the 31st: the day is held at the end of February.
      expect(updated.installments.map((item) => item.occurredOn)).toEqual([
        '2027-01-31',
        '2027-02-28',
        '2027-03-31',
      ]);
      expect(updated.installments.map((item) => item.amountCents)).toEqual([10000, 10000, 10000]);
      expect((await parcelRows(plan.id)).map((row) => row.occurred_on)).toEqual(
        updated.installments.map((item) => item.occurredOn),
      );
      expect(updated.nextInstallment).toMatchObject({ number: 1, invoiceMonth: '2027-01' });
      expect(updated.remainingCents).toBe(30000);
    });

    it('does not change what was not sent, and touches nothing when nothing differs', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const before = await snapshot(plan.id);

      const updated = await patchOk(plan.id, {
        description: plan.description,
        totalCents: 30000,
        installmentCount: 3,
        firstInvoiceMonth: '2026-12',
      });

      expect(updated).toEqual(plan);
      expect(await snapshot(plan.id)).toEqual(before);
    });
  });

  describe('category and tags', () => {
    it('sets a category and its tags on the plan and on every parcel', async () => {
      const food = await insertTestCategory(database.db);
      const tagA = await insertTestTag(database.db, { category_id: food });
      const tagB = await insertTestTag(database.db, { category_id: food });
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      const updated = await patchOk(plan.id, { categoryId: food, tagIds: [tagA, tagB, tagA] });

      expect(updated.categoryId).toBe(food);
      expect((await planRow(plan.id)).category_id).toBe(food);
      for (const row of await parcelRows(plan.id)) {
        expect(row).toMatchObject({ category_id: food, category_source: 'user' });
        expect(await tagsOf(row.id)).toEqual([tagA, tagB].sort());
      }
    });

    it('changes the category: the old tags go, and the new ones come when they are sent', async () => {
      const food = await insertTestCategory(database.db);
      const fun = await insertTestCategory(database.db);
      const foodTag = await insertTestTag(database.db, { category_id: food });
      const funTag = await insertTestTag(database.db, { category_id: fun });
      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        categoryId: food,
        tagIds: [foodTag],
      });

      await patchOk(plan.id, { categoryId: fun });
      for (const row of await parcelRows(plan.id)) {
        expect(row.category_id).toBe(fun);
        expect(await tagsOf(row.id)).toEqual([]);
      }

      await patchOk(plan.id, { categoryId: food, tagIds: [foodTag] });
      for (const row of await parcelRows(plan.id)) {
        expect(row.category_id).toBe(food);
        expect(await tagsOf(row.id)).toEqual([foodTag]);
      }

      await patchOk(plan.id, { categoryId: fun, tagIds: [funTag] });
      for (const row of await parcelRows(plan.id)) {
        expect(row.category_id).toBe(fun);
        expect(await tagsOf(row.id)).toEqual([funTag]);
      }
      expect((await planRow(plan.id)).category_id).toBe(fun);
    });

    it('takes the category off with null: the parcels have none, and no tag', async () => {
      const food = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db, { category_id: food });
      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        categoryId: food,
        tagIds: [tag],
      });

      const updated = await patchOk(plan.id, { categoryId: null });

      expect(updated.categoryId).toBeNull();
      expect((await planRow(plan.id)).category_id).toBeNull();
      for (const row of await parcelRows(plan.id)) {
        expect(row).toMatchObject({
          category_id: null,
          category_source: null,
          category_rule_id: null,
        });
        expect(await tagsOf(row.id)).toEqual([]);
      }
    });

    it('replaces only the tags and keeps the category; an empty list takes them all off', async () => {
      const food = await insertTestCategory(database.db);
      const tagA = await insertTestTag(database.db, { category_id: food });
      const tagB = await insertTestTag(database.db, { category_id: food });
      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        categoryId: food,
        tagIds: [tagA],
      });

      await patchOk(plan.id, { tagIds: [tagB] });
      for (const row of await parcelRows(plan.id)) {
        expect(row.category_id).toBe(food);
        expect(await tagsOf(row.id)).toEqual([tagB]);
      }

      await patchOk(plan.id, { tagIds: [] });
      for (const row of await parcelRows(plan.id)) {
        expect(row.category_id).toBe(food);
        expect(await tagsOf(row.id)).toEqual([]);
      }
    });

    it('gives the parcels a new count brings the category and the tags of the plan', async () => {
      const food = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db, { category_id: food });
      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        categoryId: food,
        tagIds: [tag],
      });

      const updated = await patchOk(plan.id, { installmentCount: 4 });

      const rows = await parcelRows(plan.id);
      expect(rows).toHaveLength(4);
      for (const row of rows) {
        expect(row).toMatchObject({ category_id: food, category_source: 'user' });
        expect(await tagsOf(row.id)).toEqual([tag]);
      }
      await expectSumsToTotal(updated);
    });

    it('changes the category and raises the count: the new parcel takes the new category, no old tag', async () => {
      const food = await insertTestCategory(database.db);
      const fun = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db, { category_id: food });
      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        categoryId: food,
        tagIds: [tag],
      });

      await patchOk(plan.id, { installmentCount: 4, categoryId: fun });

      for (const row of await parcelRows(plan.id)) {
        expect(row.category_id).toBe(fun);
        expect(await tagsOf(row.id)).toEqual([]);
      }
    });

    it('leaves a parcel Lucas categorized by hand alone when the category of the plan is not what changed', async () => {
      const food = await insertTestCategory(database.db);
      const fun = await insertTestCategory(database.db);
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3, categoryId: food });
      const second = plan.installments[1]?.transactionId ?? '';
      expect((await send('PATCH', `/transactions/${second}`, { categoryId: fun })).status).toBe(
        200,
      );

      await patchOk(plan.id, { categoryId: food, description: 'Poltrona' });

      const rows = await parcelRows(plan.id);
      expect(rows.map((row) => row.category_id)).toEqual([food, fun, food]);
      expect(rows.map((row) => row.description)).toEqual(['Poltrona', 'Poltrona', 'Poltrona']);
    });
  });

  describe('invoice, month summary and competence stay coherent', () => {
    it('moves the money from an invoice to the other when the first invoice moves', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      expect(await invoiceTotals('2026-12', '2027-04')).toMatchObject({
        '2026-12': 10000,
        '2027-01': 10000,
        '2027-02': 10000,
        '2027-03': 0,
        '2027-04': 0,
      });
      expect(await monthExpenses('2026-12')).toBe(10000);
      expect(await monthExpenses('2027-03')).toBe(0);

      await patchOk(plan.id, { firstInvoiceMonth: '2027-02' });

      expect(await invoiceTotals('2026-12', '2027-04')).toMatchObject({
        '2026-12': 0,
        '2027-01': 0,
        '2027-02': 10000,
        '2027-03': 10000,
        '2027-04': 10000,
      });
      // The parcel counts on the day of the purchase in the month of its invoice.
      expect(await monthExpenses('2026-12')).toBe(0);
      expect(await monthExpenses('2027-01')).toBe(0);
      expect(await monthExpenses('2027-02')).toBe(10000);
      expect(await monthExpenses('2027-04')).toBe(10000);
      const response = await send('GET', '/transactions?month=2027-03');
      const { items } = (await response.json()) as {
        items: { amountCents: number; invoiceMonth: string; competenceOn: string }[];
      };
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        amountCents: -10000,
        invoiceMonth: '2027-03',
        competenceOn: '2027-03-05',
      });
    });

    it('follows a new total in the invoices and in the month summary', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      await patchOk(plan.id, { totalCents: 60000 });

      expect(await invoiceTotals('2026-12', '2027-02')).toEqual({
        '2026-12': 20000,
        '2027-01': 20000,
        '2027-02': 20000,
      });
      expect(await monthExpenses('2026-12')).toBe(20000);
      expect(await monthExpenses('2027-02')).toBe(20000);
    });

    it('puts a new parcel in the invoice of its month and takes the removed one out', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      await patchOk(plan.id, { installmentCount: 4 });
      expect(await invoiceTotals('2026-12', '2027-04')).toMatchObject({
        '2026-12': 7500,
        '2027-01': 7500,
        '2027-02': 7500,
        '2027-03': 7500,
        '2027-04': 0,
      });
      expect(await monthExpenses('2027-03')).toBe(7500);

      await patchOk(plan.id, { installmentCount: 2 });
      expect(await invoiceTotals('2026-12', '2027-04')).toMatchObject({
        '2026-12': 15000,
        '2027-01': 15000,
        '2027-02': 0,
        '2027-03': 0,
      });
      expect(await monthExpenses('2027-02')).toBe(0);
      expect(await monthExpenses('2027-03')).toBe(0);
      expect(await monthExpenses('2027-01')).toBe(15000);
    });

    it('keeps the invoice total as the sum of the parcels of every plan on it', async () => {
      const first = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await createPlan({ description: 'Outra', totalCents: 9000, installmentCount: 3 });

      await patchOk(first.id, { totalCents: 30001 });

      expect(await invoiceTotals('2026-12', '2027-02')).toEqual({
        '2026-12': 10001 + 3000,
        '2027-01': 10000 + 3000,
        '2027-02': 10000 + 3000,
      });
    });
  });

  describe('answers', () => {
    it('answers 404 INSTALLMENT_PLAN_NOT_FOUND for a plan that does not exist', async () => {
      await expectError(
        await patch(generateId(), { description: 'x' }),
        404,
        'INSTALLMENT_PLAN_NOT_FOUND',
      );
    });

    it('answers 400 for an id that is not one and for a body the schema refuses', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await expectError(
        await send('PATCH', '/installment-plans/nope', { description: 'x' }),
        400,
        'VALIDATION_FAILED',
      );

      const wrongs: unknown[] = [
        {},
        { description: undefined },
        { description: '' },
        { description: '   ' },
        { description: 'x'.repeat(201) },
        { totalCents: 0 },
        { totalCents: -5 },
        { totalCents: 10.5 },
        { installmentCount: 1 },
        { installmentCount: 49 },
        { installmentCount: 2.5 },
        { firstInvoiceMonth: '2026-13' },
        { firstInvoiceMonth: '12/2026' },
        { categoryId: 'not-an-id' },
        { tagIds: Array.from({ length: 21 }, () => generateId()) },
        { description: 'x', purchaseOn: '2026-10-22' },
        { description: 'x', accountId: generateId() },
        { description: 'x', origin: 'bank' },
      ];
      const before = await snapshot(plan.id);
      for (const wrong of wrongs) {
        await expectError(await patch(plan.id, wrong), 400, 'VALIDATION_FAILED');
      }
      expect(await snapshot(plan.id)).toEqual(before);
    });

    it('answers 400 on a body that is not JSON', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const response = await app.request(`/installment-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      });

      expect(response.status).toBe(400);
    });

    it('answers 401 with a wrong token and writes nothing', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const before = await snapshot(plan.id);

      const response = await app.request(`/installment-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'x-fincheck-token': 'x', 'content-type': 'application/json' },
        body: JSON.stringify({ totalCents: 60000 }),
      });

      await expectError(response, 401, 'LOCAL_TOKEN_INVALID');
      expect(await snapshot(plan.id)).toEqual(before);
    });

    it('refuses the plan of the bank: 422 INSTALLMENT_PLAN_NOT_MANUAL, nothing written', async () => {
      const bankPlan = await insertTestInstallmentPlan(database.db, cardId, { origin: 'bank' });
      const before = await planRow(bankPlan);

      await expectError(
        await patch(bankPlan, { description: 'x' }),
        422,
        'INSTALLMENT_PLAN_NOT_MANUAL',
      );
      expect(await planRow(bankPlan)).toEqual(before);
    });

    it('refuses a total with less than one cent per parcel, with the count raised or the total lowered', async () => {
      const plan = await createPlan({ totalCents: 12, installmentCount: 12 });
      const before = await snapshot(plan.id);

      for (const body of [{ installmentCount: 13 }, { totalCents: 11 }]) {
        const response = await patch(plan.id, body);
        expect(response.status).toBe(400);
        const error = apiErrorSchema.parse(await response.json());
        expect(error.code).toBe('VALIDATION_FAILED');
        expect(JSON.stringify(error)).toContain('totalCents');
      }
      expect(await snapshot(plan.id)).toEqual(before);
      await patchOk(plan.id, { installmentCount: 6 });
    });

    it('keeps the first and the last invoice inside the supported years', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const before = await snapshot(plan.id);

      await expectError(
        await patch(plan.id, { firstInvoiceMonth: '1999-12' }),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await patch(plan.id, { firstInvoiceMonth: '2101-01' }),
        400,
        'VALIDATION_FAILED',
      );
      // 2100-12 + 3 parcels ends in 2101-02.
      await expectError(
        await patch(plan.id, { firstInvoiceMonth: '2100-12' }),
        400,
        'VALIDATION_FAILED',
      );
      expect(await snapshot(plan.id)).toEqual(before);
      await patchOk(plan.id, { firstInvoiceMonth: '2100-10' });
    });

    it('refuses the category and the tags the creation refuses, writing nothing', async () => {
      const food = await insertTestCategory(database.db);
      const fun = await insertTestCategory(database.db);
      const salary = await insertTestCategory(database.db, { kind: 'income', icon: 'salary' });
      const old = await insertTestCategory(database.db, { archived_at: ARCHIVED_AT });
      const funTag = await insertTestTag(database.db, { category_id: fun });
      const oldTag = await insertTestTag(database.db, {
        category_id: food,
        archived_at: ARCHIVED_AT,
      });
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3, categoryId: food });
      const before = await snapshot(plan.id);

      await expectError(
        await patch(plan.id, { categoryId: salary }),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      await expectError(
        await patch(plan.id, { categoryId: old }),
        422,
        'TRANSACTION_CATEGORY_ARCHIVED',
      );
      await expectError(
        await patch(plan.id, { categoryId: generateId() }),
        404,
        'CATEGORY_NOT_FOUND',
      );
      await expectError(
        await patch(plan.id, { tagIds: [funTag] }),
        422,
        'TRANSACTION_TAG_CATEGORY_MISMATCH',
      );
      await expectError(
        await patch(plan.id, { categoryId: fun, tagIds: [oldTag] }),
        422,
        'TRANSACTION_TAG_CATEGORY_MISMATCH',
      );
      await expectError(
        await patch(plan.id, { tagIds: [oldTag] }),
        422,
        'TRANSACTION_TAG_ARCHIVED',
      );
      await expectError(await patch(plan.id, { tagIds: [generateId()] }), 404, 'TAG_NOT_FOUND');
      await expectError(
        await patch(plan.id, { categoryId: null, tagIds: [funTag] }),
        422,
        'TRANSACTION_TAG_NEEDS_CATEGORY',
      );
      const noCategory = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await expectError(
        await patch(noCategory.id, { tagIds: [funTag] }),
        422,
        'TRANSACTION_TAG_NEEDS_CATEGORY',
      );
      expect(await snapshot(plan.id)).toEqual(before);
    });

    it('does not turn a category that is a transfer into the category of a purchase', async () => {
      const transfer = await insertTestCategory(database.db, { is_transfer: 1 });
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const before = await snapshot(plan.id);

      await expectError(
        await patch(plan.id, { categoryId: transfer }),
        422,
        'TRANSACTION_CATEGORY_NOT_ALLOWED',
      );
      expect(await snapshot(plan.id)).toEqual(before);
    });

    it('does not touch the parcels of another plan', async () => {
      const mine = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const other = await createPlan({
        description: 'Outra',
        totalCents: 9000,
        installmentCount: 3,
      });
      const before = await snapshot(other.id);

      await patchOk(mine.id, { totalCents: 90000, installmentCount: 6, description: 'Nova' });

      expect(await snapshot(other.id)).toEqual(before);
    });
  });

  describe('protection 1: an invoice that has a payment', () => {
    it('refuses to change the value, the count or the invoice of a parcel on a paid invoice, writing nothing', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await payInvoice('2027-01');
      const before = await snapshot(plan.id);

      // value (parcel 2 is on 2027-01)
      await expectError(
        await patch(plan.id, { totalCents: 60000 }),
        422,
        'INSTALLMENT_INVOICE_PAID',
      );
      // count down: the parcel 3 goes (2027-02), and the 1 and 2 change value (2027-01 is paid)
      await expectError(
        await patch(plan.id, { installmentCount: 2 }),
        422,
        'INSTALLMENT_INVOICE_PAID',
      );
      // first invoice moves: the parcel 2 leaves 2027-01
      await expectError(
        await patch(plan.id, { firstInvoiceMonth: '2027-03' }),
        422,
        'INSTALLMENT_INVOICE_PAID',
      );
      // first invoice moves so that a parcel ENTERS the paid invoice
      await expectError(
        await patch(plan.id, { firstInvoiceMonth: '2026-11' }),
        422,
        'INSTALLMENT_INVOICE_PAID',
      );
      expect(await snapshot(plan.id)).toEqual(before);
    });

    it('says which invoice is paid', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await payInvoice('2027-01');

      const response = await patch(plan.id, { totalCents: 60000 });

      expect(response.status).toBe(422);
      expect(JSON.stringify(await response.json())).toContain('2027-01');
    });

    it('refuses a new parcel that would land on a paid invoice', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await payInvoice('2027-03');
      const before = await snapshot(plan.id);

      await expectError(
        await patch(plan.id, { installmentCount: 4 }),
        422,
        'INSTALLMENT_INVOICE_PAID',
      );
      expect(await snapshot(plan.id)).toEqual(before);
    });

    it('refuses the removal of a parcel that is on a paid invoice', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await payInvoice('2027-02');
      const before = await snapshot(plan.id);

      await expectError(
        await patch(plan.id, { installmentCount: 2 }),
        422,
        'INSTALLMENT_INVOICE_PAID',
      );
      expect(await snapshot(plan.id)).toEqual(before);
    });

    it('lets the description, the category and the tags change on a paid invoice', async () => {
      const food = await insertTestCategory(database.db);
      const tag = await insertTestTag(database.db, { category_id: food });
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await payInvoice('2026-12');
      await payInvoice('2027-01');
      await payInvoice('2027-02');

      const updated = await patchOk(plan.id, {
        description: 'Poltrona',
        categoryId: food,
        tagIds: [tag],
      });

      expect(updated).toMatchObject({ description: 'Poltrona', categoryId: food });
      for (const row of await parcelRows(plan.id)) {
        expect(row).toMatchObject({
          description: 'Poltrona',
          category_id: food,
          amount_cents: -10000,
        });
        expect(await tagsOf(row.id)).toEqual([tag]);
      }
      // The values sent equal to the ones the plan has are not a change of value either.
      await patchOk(plan.id, {
        totalCents: 30000,
        installmentCount: 3,
        firstInvoiceMonth: '2026-12',
      });
    });

    it('lets a change through when the paid invoice is not one the parcels touch', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await payInvoice('2026-11');
      await payInvoice('2027-05');

      const updated = await patchOk(plan.id, { totalCents: 60000, installmentCount: 4 });

      await expectSumsToTotal(updated);
    });

    it('does not mix up the invoice of another card', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      const invoiceId = generateId();
      await database.db
        .insertInto('invoices')
        .values({
          id: invoiceId,
          account_id: otherCard,
          month: '2027-01',
          closes_on: '2027-01-05',
          due_on: '2027-01-12',
          bank_total_cents: null,
          total_override_cents: null,
          override_note: null,
          created_at: NOW,
          updated_at: NOW,
        })
        .execute();
      await database.db
        .insertInto('invoice_payments')
        .values({
          id: generateId(),
          invoice_id: invoiceId,
          transaction_id: null,
          amount_cents: 5000,
          paid_on: '2027-01-12',
          created_at: NOW,
        })
        .execute();

      const updated = await patchOk(plan.id, { totalCents: 60000 });

      await expectSumsToTotal(updated);
    });

    it('lets the value of a parcel that does not enter the accounts change on a paid invoice', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const second = plan.installments[1]?.transactionId ?? '';
      expect((await send('POST', `/transactions/${second}/ignore`)).status).toBe(200);
      await payInvoice('2027-01');

      // Only the ignored parcel is on the paid invoice, and it counts for nothing there.
      const updated = await patchOk(plan.id, { totalCents: 60000 });

      expect(updated.installments.map((item) => item.amountCents)).toEqual([20000, 20000, 20000]);
      const rows = await parcelRows(plan.id);
      expect(rows[1]).toMatchObject({ amount_cents: -20000 });
      expect(rows[1]?.ignored_at).not.toBeNull();
      expect(updated.remainingCents).toBe(40000);
    });
  });

  describe('protection 2: a split parcel', () => {
    it('refuses to change the value of a split parcel, or to remove it, writing nothing', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await splitParcel(plan.installments[2]?.transactionId ?? '', 10000);
      const before = await snapshot(plan.id);

      await expectError(
        await patch(plan.id, { totalCents: 60000 }),
        422,
        'INSTALLMENT_PARCEL_SPLIT',
      );
      await expectError(
        await patch(plan.id, { installmentCount: 2 }),
        422,
        'INSTALLMENT_PARCEL_SPLIT',
      );
      expect(await snapshot(plan.id)).toEqual(before);
      const parts = await database.db.selectFrom('transaction_splits').select('id').execute();
      expect(parts).toHaveLength(2);
    });

    it('lets what does not change the value of the split parcel through', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const split = plan.installments[1]?.transactionId ?? '';
      await splitParcel(split, 10000);

      // The description, the invoice, and a total that leaves the share of that parcel as it is.
      await patchOk(plan.id, { description: 'Poltrona' });
      await patchOk(plan.id, { firstInvoiceMonth: '2027-02' });
      const updated = await patchOk(plan.id, { totalCents: 30001 });

      expect(updated.installments.map((item) => item.amountCents)).toEqual([10001, 10000, 10000]);
      const rows = await parcelRows(plan.id);
      expect(rows[1]).toMatchObject({ description: 'Poltrona', invoice_month: '2027-03' });
      const parts = await database.db
        .selectFrom('transaction_splits')
        .select('amount_cents')
        .where('transaction_id', '=', split)
        .execute();
      expect(parts.map((part) => part.amount_cents).sort()).toEqual([-5000, -5000]);
    });

    it('refuses another category or other tags for a split parcel', async () => {
      const food = await insertTestCategory(database.db);
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await splitParcel(plan.installments[0]?.transactionId ?? '', 10000);
      const before = await snapshot(plan.id);

      await expectError(
        await patch(plan.id, { categoryId: food }),
        422,
        'INSTALLMENT_PARCEL_SPLIT',
      );
      expect(await snapshot(plan.id)).toEqual(before);
    });
  });

  describe('protection 3: a parcel that is ignored or removed by the bank', () => {
    it('updates an ignored parcel like the others and keeps it out of the sums', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const second = plan.installments[1]?.transactionId ?? '';
      expect((await send('POST', `/transactions/${second}/ignore`)).status).toBe(200);

      const updated = await patchOk(plan.id, { totalCents: 60000, firstInvoiceMonth: '2027-01' });

      const rows = await parcelRows(plan.id);
      expect(rows.map((row) => row.amount_cents)).toEqual([-20000, -20000, -20000]);
      expect(rows.map((row) => row.invoice_month)).toEqual(['2027-01', '2027-02', '2027-03']);
      expect(rows[1]?.ignored_at).not.toBeNull();
      expect(updated.installments).toHaveLength(3);
      // The ignored parcel (2027-02) is in no sum, and not in what is left to pay.
      expect(await invoiceTotals('2027-01', '2027-03')).toEqual({
        '2027-01': 20000,
        '2027-02': 0,
        '2027-03': 20000,
      });
      expect(updated.remainingCents).toBe(40000);
      await expectSumsToTotal(updated);
    });

    it('updates a parcel the bank removed without an edit, and it stays out of the sums', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await database.db
        .updateTable('transactions')
        .set({ bank_removed_at: NOW })
        .where('id', '=', plan.installments[0]?.transactionId ?? '')
        .execute();

      const updated = await patchOk(plan.id, { totalCents: 60000 });

      const rows = await parcelRows(plan.id);
      expect(rows.map((row) => row.amount_cents)).toEqual([-20000, -20000, -20000]);
      expect(rows[0]?.bank_removed_at).toBe(NOW);
      expect(await invoiceTotals('2026-12', '2027-02')).toEqual({
        '2026-12': 0,
        '2027-01': 20000,
        '2027-02': 20000,
      });
      expect(updated.remainingCents).toBe(40000);
    });

    it('removes an ignored parcel when the count falls', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const last = plan.installments[2]?.transactionId ?? '';
      expect((await send('POST', `/transactions/${last}/ignore`)).status).toBe(200);

      const updated = await patchOk(plan.id, { installmentCount: 2 });

      expect(updated.installments).toHaveLength(2);
      expect(
        await database.db.selectFrom('transactions').select('id').where('id', '=', last).execute(),
      ).toEqual([]);
    });
  });

  describe('protection 4: a parcel tied to a bill or to an occurrence', () => {
    it.each([
      ['a bill', linkToBillName],
      ['an occurrence of a recurrence', linkToOccurrenceName],
    ])(
      'refuses to change the value of a parcel tied to %s, or to remove it, writing nothing',
      async (_, kind) => {
        const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
        await (kind === linkToBillName ? linkToBill : linkToOccurrence)(
          plan.installments[1]?.transactionId ?? '',
        );
        const before = await snapshot(plan.id);

        await expectError(
          await patch(plan.id, { totalCents: 60000 }),
          422,
          'INSTALLMENT_PARCEL_LINKED',
        );
        // 30000 in 2 parcels changes the parcel 2 too.
        await expectError(
          await patch(plan.id, { installmentCount: 2 }),
          422,
          'INSTALLMENT_PARCEL_LINKED',
        );
        expect(await snapshot(plan.id)).toEqual(before);
      },
    );

    it.each([
      ['a bill', linkToBillName],
      ['an occurrence of a recurrence', linkToOccurrenceName],
    ])(
      'refuses to remove the parcel tied to %s even when its value would stay',
      async (_, kind) => {
        // 20000 in 2: after a total of 30000 in 3, the parcel 3 (last) is the linked one.
        const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
        await (kind === linkToBillName ? linkToBill : linkToOccurrence)(
          plan.installments[2]?.transactionId ?? '',
        );

        await expectError(
          await patch(plan.id, { installmentCount: 2 }),
          422,
          'INSTALLMENT_PARCEL_LINKED',
        );
      },
    );

    it.each([
      ['a bill', linkToBillName],
      ['an occurrence of a recurrence', linkToOccurrenceName],
    ])('lets every other edit through for a parcel tied to %s', async (_, kind) => {
      const food = await insertTestCategory(database.db);
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const linkedId = plan.installments[1]?.transactionId ?? '';
      await (kind === linkToBillName ? linkToBill : linkToOccurrence)(linkedId);

      // description, category, the invoice, a cent that stays in the first parcel, a bigger count
      // that leaves the linked parcel's value alone is NOT possible (the value follows the count).
      await patchOk(plan.id, { description: 'Poltrona', categoryId: food });
      await patchOk(plan.id, { firstInvoiceMonth: '2027-01' });
      const updated = await patchOk(plan.id, { totalCents: 30001 });

      expect(updated.installments.map((item) => item.amountCents)).toEqual([10001, 10000, 10000]);
      const row = (await parcelRows(plan.id))[1];
      expect(row).toMatchObject({
        id: linkedId,
        description: 'Poltrona',
        category_id: food,
        invoice_month: '2027-02',
      });
      // The link survived.
      const links = await send('GET', `/transactions/${linkedId}`);
      const dto = (await links.json()) as {
        links: { bill: unknown; occurrence: unknown };
      };
      expect(dto.links.bill !== null || dto.links.occurrence !== null).toBe(true);
    });
  });

  describe('a parcel whose value Lucas edited by hand (round 2)', () => {
    const editParcel = async (transactionId: string, amountCents: number) => {
      const response = await send('PATCH', `/transactions/${transactionId}`, { amountCents });
      expect(response.status).toBe(200);
    };

    it('sending the total or the count again, even equal, rewrites the parcels that diverge and the sum is the total again', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await editParcel(plan.installments[0]?.transactionId ?? '', 5000);
      const diverged = await getPlan(plan.id);
      expect(sum(diverged.installments.map((item) => item.amountCents))).toBe(25000);

      const fixed = await patchOk(plan.id, { totalCents: 30000 });

      expect(fixed.installments.map((item) => item.amountCents)).toEqual([10000, 10000, 10000]);
      await expectSumsToTotal(fixed);
      expect(fixed.installments.map((item) => item.transactionId)).toEqual(
        plan.installments.map((item) => item.transactionId),
      );

      await editParcel(plan.installments[2]?.transactionId ?? '', 1);
      const again = await patchOk(plan.id, { installmentCount: 3 });
      await expectSumsToTotal(again);
      expect(again.installments.map((item) => item.amountCents)).toEqual([10000, 10000, 10000]);
    });

    it('sending only the description, the category, the tags or the first invoice does not touch the value', async () => {
      const food = await insertTestCategory(database.db);
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await editParcel(plan.installments[0]?.transactionId ?? '', 5000);

      await patchOk(plan.id, { description: 'Poltrona' });
      await patchOk(plan.id, { categoryId: food, tagIds: [] });
      await patchOk(plan.id, { firstInvoiceMonth: '2027-01' });

      expect((await parcelRows(plan.id)).map((row) => row.amount_cents)).toEqual([
        -5000, -10000, -10000,
      ]);
    });

    it('respects the protections when it repairs: a paid invoice, a split, a link and a parcel of the bank refuse', async () => {
      const paid = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await editParcel(paid.installments[1]?.transactionId ?? '', 5000);
      await payInvoice('2027-01');
      const paidBefore = await snapshot(paid.id);
      await expectError(
        await patch(paid.id, { totalCents: 30000 }),
        422,
        'INSTALLMENT_INVOICE_PAID',
      );
      expect(await snapshot(paid.id)).toEqual(paidBefore);
      // The description still goes on that invoice.
      await patchOk(paid.id, { description: 'Poltrona' });

      const other = await createPlan({
        description: 'Outra',
        totalCents: 30000,
        installmentCount: 3,
      });
      await splitParcel(other.installments[0]?.transactionId ?? '', 10000);
      await editParcel(other.installments[1]?.transactionId ?? '', 5000);
      await linkToBill(other.installments[1]?.transactionId ?? '');
      const otherBefore = await snapshot(other.id);
      // The split parcel keeps its value (10000 is its share): the linked one refuses.
      await expectError(
        await patch(other.id, { totalCents: 30000 }),
        422,
        'INSTALLMENT_PARCEL_LINKED',
      );
      expect(await snapshot(other.id)).toEqual(otherBefore);
    });
  });

  describe('a plan on an archived card (round 2)', () => {
    it('refuses every edit like the creation does, writing nothing', async () => {
      const food = await insertTestCategory(database.db);
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await database.db
        .updateTable('accounts')
        .set({ archived_at: ARCHIVED_AT })
        .where('id', '=', cardId)
        .execute();
      const before = await snapshot(plan.id);

      for (const body of [
        { description: 'Poltrona' },
        { totalCents: 60000 },
        { installmentCount: 4 },
        { firstInvoiceMonth: '2027-01' },
        { categoryId: food },
        { tagIds: [] },
      ]) {
        await expectError(await patch(plan.id, body), 422, 'TRANSACTION_ACCOUNT_ARCHIVED');
      }
      expect(await snapshot(plan.id)).toEqual(before);
    });

    it('edits again when the card is back', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await database.db
        .updateTable('accounts')
        .set({ archived_at: ARCHIVED_AT })
        .where('id', '=', cardId)
        .execute();
      await expectError(
        await patch(plan.id, { description: 'x' }),
        422,
        'TRANSACTION_ACCOUNT_ARCHIVED',
      );
      await database.db
        .updateTable('accounts')
        .set({ archived_at: null })
        .where('id', '=', cardId)
        .execute();

      await patchOk(plan.id, { description: 'x' });
    });
  });

  describe('the plan the edit leaves behind', () => {
    it('can be deleted and edited again, and keeps adding up after a sequence of edits', async () => {
      const plan = await createPlan({ totalCents: 129900, installmentCount: 12 });

      let current = await patchOk(plan.id, { installmentCount: 48 });
      await expectSumsToTotal(current);
      current = await patchOk(plan.id, { totalCents: 4800, installmentCount: 48 });
      await expectSumsToTotal(current);
      expect(new Set(current.installments.map((item) => item.amountCents))).toEqual(new Set([100]));
      current = await patchOk(plan.id, {
        installmentCount: 2,
        totalCents: 777,
        firstInvoiceMonth: '2027-06',
      });
      await expectSumsToTotal(current);
      expect(current.installments.map((item) => item.amountCents)).toEqual([389, 388]);

      expect((await send('DELETE', `/installment-plans/${plan.id}`)).status).toBe(204);
      expect(await parcelRows(plan.id)).toEqual([]);
      await expectError(
        await patch(plan.id, { description: 'x' }),
        404,
        'INSTALLMENT_PLAN_NOT_FOUND',
      );
    });
  });
});
