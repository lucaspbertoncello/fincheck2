import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import { describe, expect, it } from 'vitest';

import { buildInvoiceItemGroups } from '#/features/invoices/invoice-page/utils/build-invoice-item-groups.util.ts';

const ID = '0194f3a0-0000-7000-8000-000000000001';
const FOOD = '0194f3a0-0000-7000-8000-00000000000a';

const CATEGORIES = [{ id: FOOD, name: 'Mercado', icon: 'cart' }] as Category.Dto[];

function purchase(
  description: string,
  occurredOn: string,
  amountCents: number,
  extra: Partial<Extract<Invoice.Item, { type: 'transaction' }>> = {},
): Invoice.Item {
  return {
    type: 'transaction',
    transactionId: ID,
    description,
    occurredOn,
    amountCents,
    categoryId: FOOD,
    installment: null,
    ...extra,
  };
}

const ITEMS: Invoice.Item[] = [
  purchase('Mercado', '2026-10-21', -10_000),
  purchase('Estorno', '2026-10-21', 2500),
  purchase('Geladeira', '2026-10-20', -28_990, { installment: { number: 10, count: 10 } }),
  {
    type: 'expected_recurrence',
    occurrenceId: ID,
    recurrenceName: 'Plano celular',
    expectedOn: null,
    amountCents: 5499,
  },
];

describe('buildInvoiceItemGroups', () => {
  it('groups by day, newest first, with the lines with no day last', () => {
    const groups = buildInvoiceItemGroups(ITEMS, CATEGORIES, 'date', '2026-10-22');

    expect(groups.map((group) => group.key)).toEqual(['2026-10-21', '2026-10-20', 'undated']);
    expect(groups[0]).toMatchObject({ title: 'Ontem', count: 2 });
    expect(groups[2]).toMatchObject({ title: 'Sem dia definido', count: 1 });
  });

  it('adds the signed values of a day, so a refund takes off', () => {
    const [first] = buildInvoiceItemGroups(ITEMS, CATEGORIES, 'date', '2026-10-22');
    expect(first?.totalCents).toBe(-10_000 + 2500);
  });

  it('puts the installment as a badge "10/10" that says it in full', () => {
    const groups = buildInvoiceItemGroups(ITEMS, CATEGORIES, 'date', '2026-10-22');
    const row = groups[1]?.rows[0];

    expect(row?.badges).toEqual([
      { label: '10/10', description: 'Parcela 10 de 10', tone: 'neutral' },
    ]);
    expect(row?.detail).toBe('Mercado');
  });

  it('marks a refund with the badge, the green mark and the plus value', () => {
    const [first] = buildInvoiceItemGroups(ITEMS, CATEGORIES, 'date', '2026-10-22');
    const refund = first?.rows.find((row) => row.title === 'Estorno');

    expect(refund?.badges[0]?.label).toBe('Estorno');
    expect(refund?.mark.type).toBe('income');
    expect(refund?.cents).toBe(2500);
  });

  it('draws an expected recurrence faded, with the repeat icon and a negative value', () => {
    const groups = buildInvoiceItemGroups(ITEMS, CATEGORIES, 'date', '2026-10-22');
    const row = groups[2]?.rows[0];

    expect(row).toMatchObject({
      expected: true,
      cents: -5499,
      detail: 'Recorrente · esperada no mês',
    });
    expect(row?.mark.icon).toBe('repeat');
  });

  it('orders by value in one block, the biggest charge first, with the date on each line', () => {
    const groups = buildInvoiceItemGroups(ITEMS, CATEGORIES, 'amount', '2026-10-22');

    expect(groups).toHaveLength(1);
    expect(groups[0]?.rows.map((row) => row.title)).toEqual([
      'Geladeira',
      'Mercado',
      'Plano celular',
      'Estorno',
    ]);
    expect(groups[0]?.rows[0]?.detail).toBe('20/10 · Mercado');
  });

  it('has no block when there is nothing to show', () => {
    expect(buildInvoiceItemGroups([], CATEGORIES, 'date', '2026-10-22')).toEqual([]);
    expect(buildInvoiceItemGroups([], CATEGORIES, 'amount', '2026-10-22')).toEqual([]);
  });

  it('calls a line with no category "Sem categoria", with the dashed mark', () => {
    const [group] = buildInvoiceItemGroups(
      [purchase('Coisa', '2026-10-21', -100, { categoryId: null })],
      CATEGORIES,
      'date',
      '2026-10-22',
    );

    expect(group?.rows[0]?.detail).toBe('Sem categoria');
    expect(group?.rows[0]?.mark.uncategorized).toBe(true);
  });
});
