import { describe, expect, it } from 'vitest';

import { buildOccurrenceStatusNote } from '#/features/recurrences/recurrence-list/utils/build-occurrence-status-note.util.ts';
import { describeDateRule } from '#/shared/utils/recurrences/describe-date-rule.util.ts';
import { getOccurrenceInlineActions } from '#/domain/recurrences/occurrence/rules/get-occurrence-inline-actions.rule.ts';
import { getOccurrenceRowStatus } from '#/domain/recurrences/occurrence/rules/get-occurrence-row-status.rule.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';

const payment = {
  id: 'p1',
  transactionId: 't1',
  amountCents: 10_990,
  occurredOn: '2026-10-21',
  description: 'Mensalidade Academia',
  linkedBy: 'auto' as const,
};

describe('describeDateRule', () => {
  it('writes each rule type and the number of payments', () => {
    expect(
      describeDateRule({
        type: 'fixed_day',
        day: 20,
        businessDayNumber: null,
        toleranceDays: null,
        nonBusinessDayShift: 'none',
      }),
    ).toBe('Todo dia 20');
    expect(
      describeDateRule({
        type: 'fixed_day',
        day: 10,
        businessDayNumber: null,
        toleranceDays: null,
        nonBusinessDayShift: 'after',
      }),
    ).toBe('Todo dia 10, ou o dia útil seguinte');
    expect(
      describeDateRule(
        {
          type: 'fixed_day',
          day: 10,
          businessDayNumber: null,
          toleranceDays: null,
          nonBusinessDayShift: 'before',
        },
        2,
      ),
    ).toBe('Todo dia 10, ou o dia útil anterior, em até 2 Pix');
    expect(
      describeDateRule({
        type: 'business_day',
        day: null,
        businessDayNumber: 5,
        toleranceDays: null,
        nonBusinessDayShift: null,
      }),
    ).toBe('No 5º dia útil');
    expect(
      describeDateRule({
        type: 'around_day',
        day: 25,
        businessDayNumber: null,
        toleranceDays: 2,
        nonBusinessDayShift: null,
      }),
    ).toBe('Perto do dia 25, até 2 dias antes ou depois');
    expect(
      describeDateRule({
        type: 'around_day',
        day: 10,
        businessDayNumber: null,
        toleranceDays: 1,
        nonBusinessDayShift: null,
      }),
    ).toBe('Perto do dia 10, até 1 dia antes ou depois');
    expect(
      describeDateRule({
        type: 'around_day',
        day: 10,
        businessDayNumber: null,
        toleranceDays: 0,
        nonBusinessDayShift: null,
      }),
    ).toBe('Perto do dia 10, sem folga');
    expect(
      describeDateRule(
        {
          type: 'any_day',
          day: null,
          businessDayNumber: null,
          toleranceDays: null,
          nonBusinessDayShift: null,
        },
        2,
      ),
    ).toBe('Em qualquer dia do mês, em até 2 Pix');
    expect(
      describeDateRule({
        type: 'any_day',
        day: 5,
        businessDayNumber: null,
        toleranceDays: null,
        nonBusinessDayShift: null,
      }),
    ).toBe('Em qualquer dia do mês, geralmente no dia 5');
  });
});

describe('getOccurrenceRowStatus', () => {
  it('maps the API state to the row state', () => {
    expect(getOccurrenceRowStatus(createTestOccurrence({ status: 'skipped' }))).toBe('dismissed');
    expect(getOccurrenceRowStatus(createTestOccurrence({ status: 'late' }))).toBe('late');
    expect(getOccurrenceRowStatus(createTestOccurrence({ status: 'partial' }))).toBe('partial');
    expect(getOccurrenceRowStatus(createTestOccurrence({ status: 'confirmed' }))).toBe('received');
  });

  it('is "different" only while the different amount has no answer', () => {
    const open = createTestOccurrence({
      status: 'confirmed',
      difference: { amountCents: 200, decision: null },
    });
    const answered = createTestOccurrence({
      status: 'confirmed',
      difference: { amountCents: 200, decision: 'kept' },
    });

    expect(getOccurrenceRowStatus(open)).toBe('different');
    expect(getOccurrenceRowStatus(answered)).toBe('received');
  });
});

describe('getOccurrenceInlineActions', () => {
  it('offers two actions on a late occurrence and none on an expected expense', () => {
    expect(getOccurrenceInlineActions(createTestOccurrence({ status: 'late' }))).toEqual([
      'mark-done',
      'link',
    ]);
    expect(getOccurrenceInlineActions(createTestOccurrence())).toEqual([]);
  });

  it('offers link first on an income that is waiting', () => {
    expect(getOccurrenceInlineActions(createTestOccurrence({ kind: 'income' }))).toEqual([
      'link',
      'mark-done',
    ]);
    expect(
      getOccurrenceInlineActions(createTestOccurrence({ kind: 'income', status: 'partial' })),
    ).toEqual(['link']);
  });
});

describe('buildOccurrenceStatusNote', () => {
  const context = { today: '2026-10-22', hidden: false };

  it('counts the days to an expected date', () => {
    expect(
      buildOccurrenceStatusNote(createTestOccurrence({ expectedOn: '2026-10-25' }), context),
    ).toBe('Em 3 dias');
    expect(
      buildOccurrenceStatusNote(createTestOccurrence({ expectedOn: '2026-10-23' }), context),
    ).toBe('Amanhã');
    expect(
      buildOccurrenceStatusNote(createTestOccurrence({ expectedOn: '2026-10-22' }), context),
    ).toBe('Hoje');
    expect(buildOccurrenceStatusNote(createTestOccurrence({ expectedOn: null }), context)).toBe(
      'Qualquer dia do mês',
    );
  });

  it('says when it was paid or received', () => {
    const paid = createTestOccurrence({ status: 'confirmed', payments: [payment] });
    const received = createTestOccurrence({
      kind: 'income',
      status: 'confirmed',
      payments: [payment],
    });

    expect(buildOccurrenceStatusNote(paid, context)).toBe('Pago 21/10');
    expect(buildOccurrenceStatusNote(received, context)).toBe('Recebido 21/10');
  });

  it('writes the late occurrence and the different amount, hiding money when asked', () => {
    const late = createTestOccurrence({ status: 'late', expectedOn: '2026-10-20' });
    const different = createTestOccurrence({
      status: 'confirmed',
      receivedCents: 2_390,
      payments: [payment],
      difference: { amountCents: 200, decision: null },
    });

    expect(buildOccurrenceStatusNote(late, context)).toBe('Venceu 20/10, sem pagamento ligado');
    // What came in above and what is missing are written by the card, not by the note.
    expect(buildOccurrenceStatusNote(different, context)).toBe('Cobrado acima do esperado');
    expect(buildOccurrenceStatusNote(different, { ...context, hidden: true })).toBe(
      'Cobrado acima do esperado',
    );
  });

  it('writes what is below the expected amount with the money, hiding it when asked', () => {
    const less = createTestOccurrence({
      kind: 'income',
      status: 'confirmed',
      receivedCents: 8_790,
      payments: [payment],
      difference: { amountCents: -200, decision: null },
    });

    expect(buildOccurrenceStatusNote(less, context)).toMatch(
      /^Recebido R\$\s87,90, R\$\s2,00 a menos$/,
    );
    expect(buildOccurrenceStatusNote(less, { ...context, hidden: true })).toMatch(
      /^Recebido R\$\s••,••, R\$\s•,•• a menos$/,
    );
  });

  it('does not repeat "faltam" on a late occurrence that already got a payment', () => {
    const late = createTestOccurrence({
      status: 'late',
      expectedOn: '2026-10-20',
      receivedCents: 4_000,
      remainingCents: 6_990,
      payments: [payment],
    });

    expect(buildOccurrenceStatusNote(late, context)).toBe('Venceu 20/10, com pagamento parcial');
  });

  it('counts the payments of a partial occurrence', () => {
    const partial = createTestOccurrence({
      kind: 'income',
      status: 'partial',
      payments: [payment],
    });

    expect(buildOccurrenceStatusNote(partial, context)).toBe('1 recebimento, o último em 21/10');
  });
});
