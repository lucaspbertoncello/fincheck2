import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { allocateCents } from '@fincheck/shared/common/money/allocate-cents.util.ts';
import { installmentPlanDtoSchema } from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import type { InstallmentPlan } from '@fincheck/shared/transactions/installment-plan/installment-plan.type.ts';
import {
  listTransactionsResponseSchema,
  transactionDtoSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const ARCHIVED_AT = '2026-10-01T00:00:00.000Z';

type PlanDto = InstallmentPlan.Dto;

// `GET` and `POST /installment-plans` on the real app of `main`, with every module wired and a real
// SQLite file. The clock is 2026-11-06 (Sao Paulo): the test card closes on the 5th, so the invoice
// of November is closed and the OPEN one is 2026-12 ("next parcel" and "what is left" start there).
describe('installment plan routes (real app)', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let app: ReturnType<typeof createTestApp>;
  let cardId: string;
  let checkingId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    app = createTestApp(database.db, { clock: createFixedClock(NOW) });
    cardId = await insertTestCreditCard(database.db);
    checkingId = await insertTestAccount(database.db, { name: 'Nubank' });
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

  const planBody = (overrides: Record<string, unknown> = {}) => ({
    accountId: cardId,
    description: 'Cadeira ergonômica',
    totalCents: 129900,
    installmentCount: 12,
    firstInvoiceMonth: '2026-12',
    purchaseOn: '2026-11-05',
    ...overrides,
  });

  const createPlan = async (overrides: Record<string, unknown> = {}): Promise<PlanDto> => {
    const response = await send('POST', '/installment-plans', planBody(overrides));
    expect(response.status).toBe(201);

    return installmentPlanDtoSchema.parse(await response.json());
  };

  const listPlans = async (query = ''): Promise<PlanDto[]> => {
    const response = await send('GET', `/installment-plans${query}`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: unknown[] };

    return body.items.map((item) => installmentPlanDtoSchema.parse(item));
  };

  const countRows = async () => ({
    plans: (await database.db.selectFrom('installment_plans').select('id').execute()).length,
    transactions: (await database.db.selectFrom('transactions').select('id').execute()).length,
  });

  const parcelRows = (planId: string) =>
    database.db
      .selectFrom('transactions')
      .selectAll()
      .where('installment_plan_id', '=', planId)
      .orderBy('installment_number', 'asc')
      .execute();

  describe('authentication', () => {
    it('answers 401 LOCAL_TOKEN_INVALID on both routes with a wrong token', async () => {
      const wrong = { 'x-fincheck-token': 'x' };

      await expectError(
        await app.request('/installment-plans', { headers: wrong }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
      await expectError(
        await app.request('/installment-plans', {
          method: 'POST',
          headers: { ...wrong, 'content-type': 'application/json' },
          body: JSON.stringify(planBody()),
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });
  });

  describe('POST /installment-plans', () => {
    it('creates R$ 1.299,00 in 12 as 12 parcels of R$ 108,25, one per invoice, with the plan fields', async () => {
      const plan = await createPlan();

      expect(plan).toMatchObject({
        accountId: cardId,
        origin: 'manual',
        description: 'Cadeira ergonômica',
        purchaseOn: '2026-11-05',
        totalCents: 129900,
        installmentCount: 12,
        firstInvoiceMonth: '2026-12',
        categoryId: null,
      });
      expect(plan.installments).toHaveLength(12);
      expect(plan.installments.map((item) => item.number)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
      expect(new Set(plan.installments.map((item) => item.amountCents))).toEqual(new Set([10825]));
      expect(plan.installments.reduce((sum, item) => sum + item.amountCents, 0)).toBe(129900);
      expect(plan.installments.map((item) => item.invoiceMonth)).toEqual([
        '2026-12',
        '2027-01',
        '2027-02',
        '2027-03',
        '2027-04',
        '2027-05',
        '2027-06',
        '2027-07',
        '2027-08',
        '2027-09',
        '2027-10',
        '2027-11',
      ]);
      // The purchase is on the 5th: every parcel counts on the 5th of the month of its invoice.
      expect(plan.installments.map((item) => item.occurredOn)).toEqual([
        '2026-12-05',
        '2027-01-05',
        '2027-02-05',
        '2027-03-05',
        '2027-04-05',
        '2027-05-05',
        '2027-06-05',
        '2027-07-05',
        '2027-08-05',
        '2027-09-05',
        '2027-10-05',
        '2027-11-05',
      ]);
    });

    it('writes the plan and one credit expense per parcel, negative, manual, chosen by the user', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      const planRows = await database.db.selectFrom('installment_plans').selectAll().execute();
      expect(planRows).toHaveLength(1);
      expect(planRows[0]).toMatchObject({
        id: plan.id,
        account_id: cardId,
        origin: 'manual',
        description: 'Cadeira ergonômica',
        purchase_on: '2026-11-05',
        total_cents: 30000,
        installment_count: 3,
        first_invoice_month: '2026-12',
        category_id: null,
      });
      const rows = await parcelRows(plan.id);
      expect(rows).toHaveLength(3);
      for (const [index, row] of rows.entries()) {
        expect(row).toMatchObject({
          account_id: cardId,
          origin: 'manual',
          nature: 'expense',
          nature_set_by: 'user',
          method: 'credit',
          description: 'Cadeira ergonômica',
          amount_cents: -10000,
          installment_number: index + 1,
          ignored_at: null,
          bank_removed_at: null,
        });
      }
      expect(rows.map((row) => row.invoice_month)).toEqual(['2026-12', '2027-01', '2027-02']);
      // The id of each item of the DTO is the id of its transaction.
      expect(plan.installments.map((item) => item.transactionId)).toEqual(rows.map((r) => r.id));
    });

    it('gives the leftover cents to the first parcels so the sum is still the total', async () => {
      const plan = await createPlan({ totalCents: 10000, installmentCount: 3 });

      expect(plan.installments.map((item) => item.amountCents)).toEqual([3334, 3333, 3333]);
      expect((await parcelRows(plan.id)).map((row) => row.amount_cents)).toEqual([
        -3334, -3333, -3333,
      ]);
    });

    it('holds the day of the purchase at the end of a shorter month (purchase on the 31st)', async () => {
      const plan = await createPlan({
        totalCents: 50000,
        installmentCount: 5,
        firstInvoiceMonth: '2026-12',
        purchaseOn: '2026-10-31',
      });

      expect(plan.installments.map((item) => item.invoiceMonth)).toEqual([
        '2026-12',
        '2027-01',
        '2027-02',
        '2027-03',
        '2027-04',
      ]);
      expect(plan.installments.map((item) => item.occurredOn)).toEqual([
        '2026-12-31',
        '2027-01-31',
        '2027-02-28',
        '2027-03-31',
        '2027-04-30',
      ]);
      expect((await parcelRows(plan.id)).map((row) => row.occurred_on)).toEqual(
        plan.installments.map((item) => item.occurredOn),
      );
    });

    it('holds the 29th of February in a leap year and in a common one', async () => {
      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        firstInvoiceMonth: '2027-12',
        purchaseOn: '2026-11-29',
      });

      // 2028 is a leap year (29 February exists); 2027-12 and 2028-01 have the 29th too.
      expect(plan.installments.map((item) => item.occurredOn)).toEqual([
        '2027-12-29',
        '2028-01-29',
        '2028-02-29',
      ]);
      const common = await createPlan({
        totalCents: 20000,
        installmentCount: 2,
        firstInvoiceMonth: '2027-01',
        purchaseOn: '2026-11-30',
      });
      expect(common.installments.map((item) => item.occurredOn)).toEqual([
        '2027-01-30',
        '2027-02-28',
      ]);
    });

    it('gives the category and every tag to each parcel, dropping the repeated tags', async () => {
      const food = await insertTestCategory(database.db);
      const tagA = await insertTestTag(database.db);
      const tagB = await insertTestTag(database.db);

      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        categoryId: food,
        tagIds: [tagA, tagB, tagA, tagB, tagA],
      });

      expect(plan.categoryId).toBe(food);
      const rows = await parcelRows(plan.id);
      for (const row of rows) {
        expect(row).toMatchObject({ category_id: food, category_source: 'user' });
        const tags = await database.db
          .selectFrom('transaction_tags')
          .select('tag_id')
          .where('transaction_id', '=', row.id)
          .execute();
        expect(tags.map((tag) => tag.tag_id).sort()).toEqual([tagA, tagB].sort());
      }
      const planRow = await database.db
        .selectFrom('installment_plans')
        .select('category_id')
        .executeTakeFirstOrThrow();
      expect(planRow.category_id).toBe(food);
    });

    it('trims the description and answers 201 with a body that passes the shared schema', async () => {
      const response = await send(
        'POST',
        '/installment-plans',
        planBody({ description: '  Geladeira  ', totalCents: 20000, installmentCount: 2 }),
      );

      expect(response.status).toBe(201);
      const plan = installmentPlanDtoSchema.parse(await response.json());
      expect(plan.description).toBe('Geladeira');
      expect((await parcelRows(plan.id)).map((row) => row.description)).toEqual([
        'Geladeira',
        'Geladeira',
      ]);
    });

    it('accepts the limits: 2 and 48 parcels', async () => {
      const two = await createPlan({ totalCents: 1000, installmentCount: 2 });
      const many = await createPlan({ totalCents: 48000, installmentCount: 48 });

      expect(two.installments).toHaveLength(2);
      expect(many.installments).toHaveLength(48);
      expect(many.installments.at(-1)?.invoiceMonth).toBe('2030-11');
    });

    it('accepts a total of exactly 1 cent per parcel', async () => {
      const plan = await createPlan({ totalCents: 12, installmentCount: 12 });

      expect(plan.installments.map((item) => item.amountCents)).toEqual(Array(12).fill(1));
    });
  });

  describe('next parcel and what is left, from the open invoice (2026-12) on', () => {
    it('points at parcel 3 for a plan that began on 2026-10 with 4 parcels', async () => {
      const plan = await createPlan({
        totalCents: 40003,
        installmentCount: 4,
        firstInvoiceMonth: '2026-10',
      });

      // The first parcel takes the leftover cents: 10003, 10000, 10000, 10000. Parcels 1 and 2 are
      // on closed invoices, 3 and 4 are left.
      expect(plan.installments.map((item) => item.amountCents)).toEqual([
        10003, 10000, 10000, 10000,
      ]);
      expect(plan.nextInstallment).toEqual({
        number: 3,
        invoiceMonth: '2026-12',
        amountCents: 10000,
      });
      expect(plan.remainingCents).toBe(20000);
    });

    it('counts the parcel of the open invoice itself as still to pay', async () => {
      const plan = await createPlan({
        totalCents: 20001,
        installmentCount: 2,
        firstInvoiceMonth: '2026-11',
      });

      expect(plan.nextInstallment).toEqual({
        number: 2,
        invoiceMonth: '2026-12',
        amountCents: 10000,
      });
      expect(plan.remainingCents).toBe(10000);
    });

    it('starts on parcel 1 and leaves the whole total when the plan has not begun', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      expect(plan.nextInstallment).toEqual({
        number: 1,
        invoiceMonth: '2026-12',
        amountCents: 10000,
      });
      expect(plan.remainingCents).toBe(30000);
    });

    it('has no next parcel and 0 left when every invoice is already closed', async () => {
      const plan = await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        firstInvoiceMonth: '2026-09',
      });

      // 2026-09, 2026-10 and 2026-11 are all before the open invoice.
      expect(plan.nextInstallment).toBeNull();
      expect(plan.remainingCents).toBe(0);
    });
  });

  describe('a parcel that does not enter the accounts (P3-1)', () => {
    // R$ 90,00 in 3 from 2026-12 (the open invoice): 3 x R$ 30,00 in 2026-12, 2027-01 and 2027-02.
    const ignore = (id: string) => send('POST', `/transactions/${id}/ignore`);
    const invoicedInstallments = async () => {
      const response = await send('GET', `/cards/${cardId}/invoices?from=2026-12&to=2027-02`);
      const { items } = (await response.json()) as {
        items: { breakdown: { installmentsCents: number } }[];
      };

      return items.map((item) => item.breakdown.installmentsCents);
    };

    it('leaves the ignored parcel out of what is left to pay, as the invoice does, and keeps it in the list', async () => {
      const plan = await createPlan({ totalCents: 9000, installmentCount: 3 });
      expect(plan.remainingCents).toBe(9000);

      expect((await ignore(plan.installments[1]!.transactionId)).status).toBe(200);

      const [after] = await listPlans();
      expect(after).toMatchObject({
        remainingCents: 6000,
        nextInstallment: { number: 1, invoiceMonth: '2026-12', amountCents: 3000 },
      });
      expect(after?.installments).toHaveLength(3);
      expect(await invoicedInstallments()).toEqual([3000, 0, 3000]);
    });

    it('moves the next parcel past an ignored first one, and brings it back when it is not ignored any more', async () => {
      const plan = await createPlan({ totalCents: 9000, installmentCount: 3 });
      const first = plan.installments[0]!.transactionId;
      await ignore(first);

      const [ignored] = await listPlans();
      expect(ignored).toMatchObject({
        remainingCents: 6000,
        nextInstallment: { number: 2, invoiceMonth: '2027-01' },
      });

      await send('POST', `/transactions/${first}/unignore`);
      const [back] = await listPlans();
      expect(back).toMatchObject({ remainingCents: 9000, nextInstallment: { number: 1 } });
    });

    it('leaves a parcel the bank removed without an edit out too, and finishes the plan when none is left', async () => {
      const plan = await createPlan({ totalCents: 6000, installmentCount: 2 });
      for (const parcel of plan.installments) {
        await database.db
          .updateTable('transactions')
          .set({ bank_removed_at: NOW })
          .where('id', '=', parcel.transactionId)
          .execute();
      }

      const [after] = await listPlans();

      expect(after).toMatchObject({ remainingCents: 0, nextInstallment: null });
      expect(await listPlans('?active=true')).toEqual([]);
    });
  });

  describe('GET /installment-plans', () => {
    it('lists by the invoice of the next parcel, the finished ones last by purchase date desc', async () => {
      // Created out of the expected order on purpose.
      const later = await createPlan({
        description: 'B later',
        totalCents: 20000,
        installmentCount: 2,
        firstInvoiceMonth: '2027-02',
      });
      const overOld = await createPlan({
        description: 'C over old',
        totalCents: 20000,
        installmentCount: 2,
        firstInvoiceMonth: '2026-01',
        purchaseOn: '2026-01-10',
      });
      const soon = await createPlan({
        description: 'A soon',
        totalCents: 40000,
        installmentCount: 4,
        firstInvoiceMonth: '2026-10',
      });
      const overRecent = await createPlan({
        description: 'D over recent',
        totalCents: 20000,
        installmentCount: 2,
        firstInvoiceMonth: '2026-02',
        purchaseOn: '2026-03-20',
      });

      expect((await listPlans()).map((plan) => plan.id)).toEqual([
        soon.id,
        later.id,
        overRecent.id,
        overOld.id,
      ]);
    });

    it('filters by card', async () => {
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      const mine = await createPlan({ description: 'No meu cartão' });
      const theirs = await createPlan({ accountId: otherCard, description: 'No outro' });

      expect((await listPlans(`?accountId=${cardId}`)).map((plan) => plan.id)).toEqual([mine.id]);
      expect((await listPlans(`?accountId=${otherCard}`)).map((plan) => plan.id)).toEqual([
        theirs.id,
      ]);
      expect(await listPlans()).toHaveLength(2);
    });

    it('filters by active=true and active=false', async () => {
      const active = await createPlan({ description: 'Ativo', firstInvoiceMonth: '2026-12' });
      const lastParcelOpen = await createPlan({
        description: 'Última parcela na aberta',
        firstInvoiceMonth: '2026-11',
        installmentCount: 2,
        totalCents: 2000,
      });
      const over = await createPlan({
        description: 'Acabou',
        firstInvoiceMonth: '2026-01',
        installmentCount: 2,
        totalCents: 2000,
      });

      expect((await listPlans('?active=true')).map((plan) => plan.id).sort()).toEqual(
        [active.id, lastParcelOpen.id].sort(),
      );
      expect((await listPlans('?active=false')).map((plan) => plan.id)).toEqual([over.id]);
      expect(await listPlans()).toHaveLength(3);
    });

    it('combines the card with active', async () => {
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      const mineActive = await createPlan({ description: 'Meu ativo' });
      await createPlan({
        description: 'Meu acabado',
        firstInvoiceMonth: '2026-01',
        installmentCount: 2,
        totalCents: 2000,
      });
      await createPlan({ accountId: otherCard, description: 'Do outro ativo' });

      expect((await listPlans(`?accountId=${cardId}&active=true`)).map((plan) => plan.id)).toEqual([
        mineActive.id,
      ]);
    });

    it('answers an empty list when there is no plan', async () => {
      expect(await listPlans()).toEqual([]);
      expect(await listPlans(`?accountId=${cardId}`)).toEqual([]);
    });

    it('answers 404 ACCOUNT_NOT_FOUND for an accountId that does not exist', async () => {
      await expectError(
        await send('GET', `/installment-plans?accountId=${generateId()}`),
        404,
        'ACCOUNT_NOT_FOUND',
      );
    });

    it('answers 400 for a query the schema refuses', async () => {
      await expectError(
        await send('GET', '/installment-plans?active=maybe'),
        400,
        'VALIDATION_FAILED',
      );
      await expectError(
        await send('GET', '/installment-plans?accountId=not-an-id'),
        400,
        'VALIDATION_FAILED',
      );
    });
  });

  describe('what the plan puts in the transactions routes', () => {
    it('shows each parcel in the competence of the month of its invoice', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });

      const list = async (month: string) => {
        const response = await send('GET', `/transactions?month=${month}`);
        expect(response.status).toBe(200);

        return listTransactionsResponseSchema.parse(await response.json()).items;
      };

      expect(await list('2026-11')).toEqual([]);
      const december = await list('2026-12');
      expect(december).toHaveLength(1);
      expect(december[0]).toMatchObject({
        amountCents: -10000,
        invoiceMonth: '2026-12',
        competenceOn: '2026-12-05',
        installment: { planId: plan.id, number: 1, count: 3 },
        nature: 'expense',
        method: 'credit',
        origin: 'manual',
      });
      const january = await list('2027-01');
      expect(january.map((item) => item.installment)).toEqual([
        { planId: plan.id, number: 2, count: 3 },
      ]);
      expect(january[0]?.competenceOn).toBe('2027-01-05');
      expect((await list('2027-02'))[0]?.installment?.number).toBe(3);
    });

    it('counts a parcel on the last day of a short month in that month', async () => {
      await createPlan({
        totalCents: 30000,
        installmentCount: 3,
        firstInvoiceMonth: '2027-01',
        purchaseOn: '2026-10-31',
      });

      const response = await send('GET', '/transactions?month=2027-02');
      const items = listTransactionsResponseSchema.parse(await response.json()).items;

      expect(items).toHaveLength(1);
      expect(items[0]?.competenceOn).toBe('2027-02-28');
    });

    it('answers the installment of a parcel in GET /transactions/:id', async () => {
      const plan = await createPlan({ totalCents: 30000, installmentCount: 3 });
      const second = plan.installments[1];

      const response = await send('GET', `/transactions/${second?.transactionId ?? ''}`);

      expect(response.status).toBe(200);
      const dto = transactionDtoSchema.parse(await response.json());
      expect(dto.installment).toEqual({ planId: plan.id, number: 2, count: 3 });
      expect(dto).toMatchObject({
        accountId: cardId,
        amountCents: -10000,
        invoiceMonth: '2027-01',
        isEdited: false,
      });
    });

    it('filters /transactions by installmentPlanId', async () => {
      const first = await createPlan({ totalCents: 30000, installmentCount: 3 });
      await createPlan({ description: 'Outra', totalCents: 20000, installmentCount: 2 });

      const response = await send(
        'GET',
        `/transactions?from=2026-01-01&to=2030-12-31&installmentPlanId=${first.id}`,
      );
      expect(response.status).toBe(200);
      const items = listTransactionsResponseSchema.parse(await response.json()).items;

      expect(items).toHaveLength(3);
      expect(new Set(items.map((item) => item.installment?.planId))).toEqual(new Set([first.id]));
    });
  });

  describe('POST errors', () => {
    it('answers 404 ACCOUNT_NOT_FOUND and leaves nothing written', async () => {
      await expectError(
        await send('POST', '/installment-plans', planBody({ accountId: generateId() })),
        404,
        'ACCOUNT_NOT_FOUND',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 422 INSTALLMENT_ACCOUNT_NOT_CARD for an account that is not a card', async () => {
      await expectError(
        await send('POST', '/installment-plans', planBody({ accountId: checkingId })),
        422,
        'INSTALLMENT_ACCOUNT_NOT_CARD',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 422 TRANSACTION_ACCOUNT_ARCHIVED for an archived card', async () => {
      const archived = await insertTestCreditCard(database.db, {
        name: 'Cartão antigo',
        archived_at: ARCHIVED_AT,
      });

      await expectError(
        await send('POST', '/installment-plans', planBody({ accountId: archived })),
        422,
        'TRANSACTION_ACCOUNT_ARCHIVED',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 422 TRANSACTION_CATEGORY_KIND_MISMATCH for a category of income', async () => {
      const salary = await insertTestCategory(database.db, { kind: 'income', icon: 'salary' });

      await expectError(
        await send('POST', '/installment-plans', planBody({ categoryId: salary })),
        422,
        'TRANSACTION_CATEGORY_KIND_MISMATCH',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 422 TRANSACTION_CATEGORY_ARCHIVED for an archived category', async () => {
      const old = await insertTestCategory(database.db, { archived_at: ARCHIVED_AT });

      await expectError(
        await send('POST', '/installment-plans', planBody({ categoryId: old })),
        422,
        'TRANSACTION_CATEGORY_ARCHIVED',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 422 TRANSACTION_TAG_ARCHIVED when one of the tags is archived', async () => {
      const fine = await insertTestTag(database.db);
      const old = await insertTestTag(database.db, { archived_at: ARCHIVED_AT });

      await expectError(
        await send('POST', '/installment-plans', planBody({ tagIds: [fine, old] })),
        422,
        'TRANSACTION_TAG_ARCHIVED',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 404 CATEGORY_NOT_FOUND for a category that does not exist', async () => {
      await expectError(
        await send('POST', '/installment-plans', planBody({ categoryId: generateId() })),
        404,
        'CATEGORY_NOT_FOUND',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 404 TAG_NOT_FOUND for a tag that does not exist', async () => {
      const fine = await insertTestTag(database.db);

      await expectError(
        await send('POST', '/installment-plans', planBody({ tagIds: [fine, generateId()] })),
        404,
        'TAG_NOT_FOUND',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 400 VALIDATION_FAILED for what the schema refuses, writing nothing', async () => {
      const wrongs: Record<string, unknown>[] = [
        { totalCents: 0 },
        { totalCents: -100 },
        { totalCents: 10.5 },
        { installmentCount: 1 },
        { installmentCount: 49 },
        { installmentCount: 2.5 },
        { firstInvoiceMonth: '2026-13' },
        { firstInvoiceMonth: '2026-1' },
        { firstInvoiceMonth: '12/2026' },
        { purchaseOn: '2026-02-30' },
        { purchaseOn: '05/11/2026' },
        { description: '' },
        { description: '   ' },
        { description: 'x'.repeat(201) },
        { tagIds: Array.from({ length: 21 }, () => generateId()) },
        { accountId: 'not-an-id' },
      ];

      for (const wrong of wrongs) {
        await expectError(
          await send('POST', '/installment-plans', planBody(wrong)),
          400,
          'VALIDATION_FAILED',
        );
      }
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 400 VALIDATION_FAILED on totalCents when the total is less than 1 cent per parcel', async () => {
      const response = await send(
        'POST',
        '/installment-plans',
        planBody({ totalCents: 11, installmentCount: 12 }),
      );

      expect(response.status).toBe(400);
      const body = apiErrorSchema.parse(await response.json());
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(JSON.stringify(body)).toContain('totalCents');
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });

    it('answers 400 VALIDATION_FAILED for a missing field and for a body that is not JSON', async () => {
      const withoutDescription: Record<string, unknown> = { ...planBody() };
      delete withoutDescription['description'];

      await expectError(
        await send('POST', '/installment-plans', withoutDescription),
        400,
        'VALIDATION_FAILED',
      );
      const notJson = await app.request('/installment-plans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{oops',
      });
      expect(notJson.status).toBe(400);
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });
  });

  // The parcels of a plan always add up to its total, whatever the total and the count.
  describe('the sum of the parcels is always the total', () => {
    it.each([
      [100, 3],
      [129900, 12],
      [999, 7],
      [10000, 3],
      [2, 2],
      [1, 2],
      [47, 48],
      [48, 48],
      [49, 48],
      [1000000, 48],
      [123457, 11],
      [30001, 3],
    ] as const)('total %i in %i parcels', async (totalCents, installmentCount) => {
      if (totalCents < installmentCount) {
        await expectError(
          await send('POST', '/installment-plans', planBody({ totalCents, installmentCount })),
          400,
          'VALIDATION_FAILED',
        );

        return;
      }
      const plan = await createPlan({ totalCents, installmentCount });

      const amounts = plan.installments.map((item) => item.amountCents);
      expect(amounts).toHaveLength(installmentCount);
      expect(amounts.reduce((sum, value) => sum + value, 0)).toBe(totalCents);
      // The first parcel takes every leftover cent; the others are equal.
      const base = Math.floor(totalCents / installmentCount);
      expect(amounts).toEqual([
        totalCents - base * (installmentCount - 1),
        ...Array<number>(installmentCount - 1).fill(base),
      ]);
      expect(amounts).toEqual(allocateCents(totalCents, installmentCount));
      expect(amounts.every((value) => Number.isInteger(value) && value >= 1)).toBe(true);

      const stored = (await parcelRows(plan.id)).map((row) => row.amount_cents);
      expect(stored.reduce((sum, value) => sum + value, 0)).toBe(-totalCents);
      expect(plan.remainingCents).toBe(totalCents);
    });

    it('refuses [1, 2] (less than 1 cent per parcel) with 400 and writes nothing', async () => {
      await expectError(
        await send('POST', '/installment-plans', planBody({ totalCents: 1, installmentCount: 2 })),
        400,
        'VALIDATION_FAILED',
      );
      expect(await countRows()).toEqual({ plans: 0, transactions: 0 });
    });
  });
});
