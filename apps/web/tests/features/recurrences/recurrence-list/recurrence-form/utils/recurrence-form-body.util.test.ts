import { describe, expect, it } from 'vitest';

import { EMPTY_FORM_VALUES } from '#/features/recurrences/recurrence-list/recurrence-form/constants/empty-form-values.constant.ts';
import { buildCreateBody } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-create-body.util.ts';
import { buildFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-form-values.util.ts';
import { buildHistoryNote } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-history-note.util.ts';
import { buildUpdateBody } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-update-body.util.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';
import { createTestRecurrence } from '#tests/support/recurrences/recurrence/create-test-recurrence.util.ts';

describe('buildCreateBody', () => {
  const filled = { ...EMPTY_FORM_VALUES, name: 'Netflix', amountCents: 5_590, day: '21' };

  it('builds the body with only the fields the rule uses', () => {
    const result = buildCreateBody(filled);

    expect(result).toEqual({
      status: 'ok',
      body: {
        kind: 'expense',
        name: 'Netflix',
        expectedAmountCents: 5_590,
        dateRule: {
          type: 'fixed_day',
          day: 21,
          businessDayNumber: null,
          toleranceDays: null,
          nonBusinessDayShift: 'none',
        },
        maxPayments: 1,
      },
    });
  });

  it('sends the weekend and holiday shift of a fixed day, and none for the other rules', () => {
    const fixed = buildCreateBody({ ...filled, nonBusinessDayShift: 'after' });
    const around = buildCreateBody({
      ...filled,
      ruleType: 'around_day',
      toleranceDays: '2',
      nonBusinessDayShift: 'after',
    });

    expect(fixed.status === 'ok' && fixed.body.dateRule.nonBusinessDayShift).toBe('after');
    expect(around.status === 'ok' && around.body.dateRule.nonBusinessDayShift).toBeNull();
  });

  it('sends the extract name when it was typed', () => {
    const result = buildCreateBody({ ...filled, matchText: ' G PRADO ' });

    expect(result.status === 'ok' && result.body.matchText).toBe('G PRADO');
  });

  it('sends the category and the account, and the regime only for income', () => {
    const expense = buildCreateBody({
      ...filled,
      categoryId: '3f0c3a1e-0000-4000-8000-000000000010',
      accountId: '3f0c3a1e-0000-4000-8000-000000000011',
      employmentRegime: 'clt',
    });
    const income = buildCreateBody({ ...filled, kind: 'income', employmentRegime: 'pj' });

    expect(expense.status === 'ok' && expense.body).toMatchObject({
      categoryId: '3f0c3a1e-0000-4000-8000-000000000010',
      accountId: '3f0c3a1e-0000-4000-8000-000000000011',
    });
    expect(expense.status === 'ok' && expense.body.employmentRegime).toBeUndefined();
    expect(income.status === 'ok' && income.body.employmentRegime).toBe('pj');
  });

  it('points at each field the schema rejects', () => {
    const result = buildCreateBody({ ...EMPTY_FORM_VALUES, ruleType: 'around_day', day: '40' });

    expect(result).toEqual({
      status: 'invalid',
      errors: {
        name: 'Dê um nome à recorrência, com até 80 letras.',
        amountCents: 'Informe um valor maior que zero.',
        day: 'Informe um dia de 1 a 31.',
        toleranceDays: 'Informe de 0 a 15 dias.',
      },
    });
  });
});

describe('buildUpdateBody', () => {
  const saved = createTestRecurrence({ matchText: 'ACADEMIA FORMA' });

  it('says "unchanged" when nothing differs', () => {
    expect(buildUpdateBody(buildFormValues(saved), saved)).toEqual({ status: 'unchanged' });
  });

  it('sends only what changed, plus where the change applies', () => {
    const values = {
      ...buildFormValues(saved),
      amountCents: 11_990,
      applyFrom: 'current_month' as const,
    };

    expect(buildUpdateBody(values, saved)).toEqual({
      status: 'ok',
      body: { expectedAmountCents: 11_990, applyFrom: 'current_month' },
    });
  });

  it('sends the new category, account and regime of an income', () => {
    const income = createTestRecurrence({ kind: 'income', employmentRegime: 'clt' });
    const result = buildUpdateBody(
      {
        ...buildFormValues(income),
        categoryId: '3f0c3a1e-0000-4000-8000-000000000010',
        employmentRegime: 'pj',
      },
      income,
    );

    expect(result.status === 'ok' && result.body).toMatchObject({
      categoryId: '3f0c3a1e-0000-4000-8000-000000000010',
      employmentRegime: 'pj',
    });
  });

  it('clears an optional field with null and sends the whole rule when it changes', () => {
    const values = {
      ...buildFormValues(saved),
      matchText: '',
      ruleType: 'business_day' as const,
      businessDayNumber: '5',
    };
    const result = buildUpdateBody(values, saved);

    expect(result.status === 'ok' && result.body).toMatchObject({
      matchText: null,
      dateRule: { type: 'business_day', day: null, businessDayNumber: 5, toleranceDays: null },
    });
  });
});

describe('weekend and holiday shift when editing', () => {
  it('loads the saved shift, and "none" when the saved rule has none', () => {
    const shifted = createTestRecurrence({
      dateRule: {
        type: 'fixed_day',
        day: 10,
        businessDayNumber: null,
        toleranceDays: null,
        nonBusinessDayShift: 'after',
      },
    });
    const around = createTestRecurrence({
      dateRule: {
        type: 'around_day',
        day: 25,
        businessDayNumber: null,
        toleranceDays: 2,
        nonBusinessDayShift: null,
      },
    });

    expect(buildFormValues(shifted).nonBusinessDayShift).toBe('after');
    expect(buildFormValues(around).nonBusinessDayShift).toBe('none');
    expect(buildUpdateBody(buildFormValues(around), around)).toEqual({ status: 'unchanged' });
  });

  it('sends the whole rule when only the shift changes', () => {
    const saved = createTestRecurrence();
    const result = buildUpdateBody(
      { ...buildFormValues(saved), nonBusinessDayShift: 'before' },
      saved,
    );

    expect(result).toEqual({
      status: 'ok',
      body: {
        dateRule: {
          type: 'fixed_day',
          day: 25,
          businessDayNumber: null,
          toleranceDays: null,
          nonBusinessDayShift: 'before',
        },
        applyFrom: 'next_month',
      },
    });
  });
});

describe('form helpers', () => {
  it('writes the history of confirmations', () => {
    const payment = (day: string) => [
      { id: day, transactionId: day, amountCents: 1, occurredOn: day, linkedBy: 'auto' as const },
    ];
    const history = [
      createTestOccurrence({
        status: 'confirmed',
        receivedCents: 380_000,
        payments: payment('2026-09-25'),
      }),
      createTestOccurrence({ status: 'confirmed', payments: payment('2026-08-27') }),
      createTestOccurrence({ status: 'confirmed', payments: payment('2026-07-24') }),
    ];

    expect(buildHistoryNote(history, true)).toMatch(
      /^Confirmada em 25\/09 \(R\$\s•\.•••,••\), 27\/08 e 24\/07\. Mudar o valor não altera o que já foi confirmado\.$/,
    );
    expect(buildHistoryNote([], false)).toMatch(/^Ainda sem confirmações\./);
  });
});
