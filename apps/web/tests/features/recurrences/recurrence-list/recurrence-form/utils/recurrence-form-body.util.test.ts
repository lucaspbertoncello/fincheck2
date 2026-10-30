import { describe, expect, it } from 'vitest';

import { EMPTY_FORM_VALUES } from '#/features/recurrences/recurrence-list/recurrence-form/constants/empty-form-values.constant.ts';
import { buildCreateBody } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-create-body.util.ts';
import { buildDateRuleOptions } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-date-rule-options.util.ts';
import { buildFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-form-values.util.ts';
import { buildHistoryNote } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-history-note.util.ts';
import { buildUpdateBody } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-update-body.util.ts';
import { formatPreviewDate } from '#/features/recurrences/recurrence-list/recurrence-form/utils/format-preview-date.util.ts';
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
        dateRule: { type: 'fixed_day', day: 21, businessDayNumber: null, toleranceDays: null },
        maxPayments: 1,
      },
    });
  });

  it('sends the extract name when it was typed', () => {
    const result = buildCreateBody({ ...filled, matchText: ' G PRADO ' });

    expect(result.status === 'ok' && result.body.matchText).toBe('G PRADO');
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

describe('form helpers', () => {
  it('repeats the typed values on the chosen rule card only', () => {
    const options = buildDateRuleOptions({
      ruleType: 'around_day',
      day: '25',
      businessDayNumber: '',
      toleranceDays: '2',
    });

    expect(options.find((item) => item.key === 'around_day')?.hint).toBe(
      'Dia 25, 2 dias para mais ou menos',
    );
    expect(options.find((item) => item.key === 'fixed_day')?.hint).toBe('Sempre no mesmo dia');
  });

  it('writes the preview date with the weekday', () => {
    expect(formatPreviewDate('2026-11-20', '2026-11')).toBe('sex, 20/11');
    expect(formatPreviewDate(null, '2026-11')).toBe('qualquer dia de novembro');
  });

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

    expect(buildHistoryNote(history, true)).toBe(
      'Confirmada em 25/09 (R$ ••••), 27/08 e 24/07. Mudar o valor não altera o que já foi confirmado.',
    );
    expect(buildHistoryNote([], false)).toMatch(/^Ainda sem confirmações\./);
  });
});
