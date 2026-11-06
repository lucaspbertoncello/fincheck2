import { describe, expect, it } from 'vitest';

import { buildExpenseBar } from '#/domain/dashboard/month-summary/rules/build-expense-bar.rule.ts';
import { buildIncomeBar } from '#/domain/dashboard/month-summary/rules/build-income-bar.rule.ts';
import { buildResultBar } from '#/domain/dashboard/month-summary/rules/build-result-bar.rule.ts';

describe('summary bars', () => {
  it('fills the income bar with received over expected, capped at 100', () => {
    expect(buildIncomeBar(380200, 842700)[0]?.percent).toBeCloseTo(45.1, 1);
    expect(buildIncomeBar(900000, 842700)[0]?.percent).toBe(100);
    expect(buildIncomeBar(100, 0)[0]?.percent).toBe(0);
  });

  it('paints the expense bar gray for the previous month and red past it', () => {
    expect(buildExpenseBar(300000, 400000).map((s) => s.tone)).toEqual(['strong', 'muted']);
    const over = buildExpenseBar(500000, 400000);
    expect(over.map((s) => s.tone)).toEqual(['strong', 'loss']);
    expect(over[0]?.percent).toBeCloseTo(80);
    expect(over[1]?.percent).toBeCloseTo(20);
    expect(buildExpenseBar(0, 0)).toEqual([]);
  });

  it('splits the result bar into expenses and what is left, red when overspent', () => {
    expect(buildResultBar(1000, 250).map((s) => s.tone)).toEqual(['muted', 'gain']);
    expect(buildResultBar(1000, 1500)).toEqual([{ percent: 100, tone: 'loss' }]);
  });
});
