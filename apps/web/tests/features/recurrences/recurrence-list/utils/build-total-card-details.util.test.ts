import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import { describe, expect, it } from 'vitest';

import { buildTotalCardDetails } from '#/features/recurrences/recurrence-list/utils/build-total-card-details.util.ts';

const summary: Recurrence.Summary = {
  incomes: { expectedCents: 537_002, receivedCents: 338_722, missingCents: 198_280, count: 5 },
  expenses: {
    expectedCents: 54_259,
    paidCents: 20_000,
    missingCents: 32_359,
    paidCount: 1,
    lateCount: 1,
    differentCount: 1,
    count: 3,
  },
};

const plain = (text: string | undefined) => text?.replace(/\s/g, '');

describe('buildTotalCardDetails', () => {
  it('writes what came in and what is missing on Receitas, each leading somewhere', () => {
    const [received, missing, ...others] = buildTotalCardDetails(
      'income',
      summary,
      '2026-11',
      false,
    );

    expect(plain(received?.text)).toBe('R$3.387,22járecebidos');
    expect(received?.href).toBe('/transactions?type=income&recurrence=linked&month=2026-11');
    expect(received?.srHint).toBe('ver as transações recebidas neste mês');
    expect(plain(missing?.text)).toBe('faltamR$1.982,80');
    expect(missing?.href).toBe('/recurrences?flow=income&show=missing&month=2026-11');
    expect(missing?.srHint).toBe('ver o que falta receber');
    expect(others).toEqual([]);
  });

  it('writes what was paid and what is missing on Despesas, and keeps the late and different notes', () => {
    const details = buildTotalCardDetails('expense', summary, '2026-11', false);

    expect(plain(details[0]?.text)).toBe('R$200,00pagos');
    expect(details[0]?.href).toBe('/transactions?type=expense&recurrence=linked&month=2026-11');
    expect(details[0]?.srHint).toBe('ver as transações pagas neste mês');
    expect(plain(details[1]?.text)).toBe('faltamR$323,59');
    expect(details[1]?.href).toBe('/recurrences?flow=expense&show=missing&month=2026-11');
    expect(details[1]?.srHint).toBe('ver o que falta pagar');
    expect(details[2]).toEqual({ key: 'notes', text: '1 atrasada, 1 com valor diferente' });
  });

  it('leaves the notes out when there is no late one and no different one, and pluralizes', () => {
    const quiet = buildTotalCardDetails(
      'expense',
      { ...summary, expenses: { ...summary.expenses, lateCount: 0, differentCount: 0 } },
      '2026-11',
      false,
    );
    const many = buildTotalCardDetails(
      'expense',
      { ...summary, expenses: { ...summary.expenses, lateCount: 2, differentCount: 0 } },
      '2026-11',
      false,
    );

    expect(quiet).toHaveLength(2);
    expect(many[2]?.text).toBe('2 atrasadas');
  });

  it('makes plain text of a line of R$ 0,00', () => {
    const details = buildTotalCardDetails(
      'income',
      { ...summary, incomes: { ...summary.incomes, receivedCents: 0, missingCents: 0 } },
      '2026-11',
      false,
    );

    expect(plain(details[0]?.text)).toBe('R$0,00járecebidos');
    expect(details[0]?.href).toBeUndefined();
    expect(plain(details[1]?.text)).toBe('faltamR$0,00');
    expect(details[1]?.href).toBeUndefined();
  });

  it('masks the money with the eye on and keeps the links', () => {
    const [received, missing] = buildTotalCardDetails('income', summary, '2026-11', true);

    expect(received?.text).not.toMatch(/\d/);
    expect(received?.text).toContain('já recebidos');
    expect(missing?.text).not.toMatch(/\d/);
    expect(received?.href).toBeDefined();
    expect(missing?.href).toBeDefined();
  });

  it('says there is nothing fixed when the side has no recurrence', () => {
    expect(
      buildTotalCardDetails(
        'expense',
        { ...summary, expenses: { ...summary.expenses, count: 0 } },
        '2026-11',
        false,
      ),
    ).toEqual([{ key: 'none', text: 'Nenhuma despesa fixa' }]);
    expect(
      buildTotalCardDetails(
        'income',
        { ...summary, incomes: { ...summary.incomes, count: 0 } },
        '2026-11',
        false,
      ),
    ).toEqual([{ key: 'none', text: 'Nenhuma receita fixa' }]);
  });
});
