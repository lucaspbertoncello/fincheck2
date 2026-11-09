import { categoryTrendDtoSchema } from '@fincheck/shared/dashboard/category-trend/category-trend.schema.ts';
import { describe, expect, it } from 'vitest';

import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { addTransaction } from '#tests/mocks/dashboard/support/add-transaction.util.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

type CategoryItem = { id: string; name: string; kind: 'expense' | 'income' };

async function findCategory(name: string): Promise<CategoryItem> {
  const { json } = await callApi('GET', '/categories?status=all');
  const item = (json as { items: CategoryItem[] }).items.find((category) => category.name === name);
  if (!item) throw new Error(`Seed has no category ${name}`);

  return item;
}

async function trend(id: string, query = '') {
  const answer = await callApi('GET', `/dashboard/categories/${id}/trend${query}`);
  expect(answer.status).toBe(200);

  return categoryTrendDtoSchema.parse(answer.json);
}

describe('GET /dashboard/categories/:id/trend', () => {
  it('brings 12 months, oldest first, ending at the current month', async () => {
    const mercado = await findCategory('Mercado');
    const dto = await trend(mercado.id);

    expect(dto.categoryId).toBe(mercado.id);
    expect(dto.kind).toBe('expense');
    expect(dto.months).toHaveLength(12);
    expect(dto.months.at(-1)?.month).toBe(CURRENT_MONTH);
    expect(dto.months.map((item) => item.month)).toEqual(
      [...dto.months.map((item) => item.month)].sort(),
    );
  });

  it('ends at `until` and writes zero for a month with no movement', async () => {
    const mercado = await findCategory('Mercado');
    const dto = await trend(mercado.id, '?until=2020-06');

    expect(dto.months[0]?.month).toBe('2019-07');
    expect(dto.months.at(-1)?.month).toBe('2020-06');
    expect(dto.months.every((item) => item.totalCents === 0 && item.transactionCount === 0)).toBe(
      true,
    );
  });

  it('adds up to what the categories of the same window say, with no sign', async () => {
    const mercado = await findCategory('Mercado');
    const dto = await trend(mercado.id);
    const first = dto.months[0]?.month ?? '';
    const breakdown = await callApi(
      'GET',
      `/dashboard/categories?from=${first}-01&to=${CURRENT_MONTH}-31`,
    );
    const item = (
      breakdown.json as {
        expenses: { items: { categoryId: string; spentCents: number; transactionCount: number }[] };
      }
    ).expenses.items.find((entry) => entry.categoryId === mercado.id);

    expect(dto.months.reduce((sum, month) => sum + month.totalCents, 0)).toBe(item?.spentCents);
    expect(dto.months.reduce((sum, month) => sum + month.transactionCount, 0)).toBe(
      item?.transactionCount,
    );
    expect(dto.months.every((month) => month.totalCents >= 0)).toBe(true);
  });

  it('reads an income category as received money', async () => {
    const salario = await findCategory('Salário');
    const dto = await trend(salario.id);

    expect(dto.kind).toBe('income');
    expect(dto.months.some((month) => month.totalCents > 0)).toBe(true);
  });

  it('answers CATEGORY_NOT_FOUND for a category that does not exist and 400 for a bad month', async () => {
    const missing = await callApi(
      'GET',
      '/dashboard/categories/0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b/trend',
    );
    expect(missing.status).toBe(404);
    expect((missing.json as { code: string }).code).toBe('CATEGORY_NOT_FOUND');

    const mercado = await findCategory('Mercado');
    expect(
      (await callApi('GET', `/dashboard/categories/${mercado.id}/trend?until=2026-13`)).status,
    ).toBe(400);
  });

  it('shows 0, never a negative bar, for a month whose refund was bigger than its spending', async () => {
    const mercado = await findCategory('Mercado');
    const refund = addTransaction({ nature: 'expense', amountCents: 900_000, occurredOn: TODAY });
    Object.assign(refund, { categoryId: mercado.id, amountCents: 900_000 });

    const dto = await trend(mercado.id);

    expect(dto.months.at(-1)?.totalCents).toBe(0);
    expect(dto.months.every((item) => item.totalCents >= 0)).toBe(true);
  });
});
