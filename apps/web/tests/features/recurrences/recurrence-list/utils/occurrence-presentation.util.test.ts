import { describe, expect, it } from 'vitest';

import { buildOccurrenceStatusNote } from '#/features/recurrences/recurrence-list/utils/build-occurrence-status-note.util.ts';
import { describeDateRule } from '#/features/recurrences/recurrence-list/utils/describe-date-rule.util.ts';
import { getOccurrenceAmount } from '#/domain/recurrences/occurrence/rules/get-occurrence-amount.rule.ts';
import { getOccurrenceInlineActions } from '#/domain/recurrences/occurrence/rules/get-occurrence-inline-actions.rule.ts';
import { getOccurrenceRowStatus } from '#/domain/recurrences/occurrence/rules/get-occurrence-row-status.rule.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';

const payment = {
  id: 'p1',
  transactionId: 't1',
  amountCents: 10_990,
  occurredOn: '2026-10-21',
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
      }),
    ).toBe('Todo dia 20');
    expect(
      describeDateRule({
        type: 'business_day',
        day: null,
        businessDayNumber: 5,
        toleranceDays: null,
      }),
    ).toBe('Até o 5º dia útil');
    expect(
      describeDateRule({ type: 'around_day', day: 25, businessDayNumber: null, toleranceDays: 2 }),
    ).toBe('Por volta do dia 25');
    expect(
      describeDateRule(
        { type: 'any_day', day: null, businessDayNumber: null, toleranceDays: null },
        2,
      ),
    ).toBe('Qualquer dia, em até 2 Pix');
    expect(
      describeDateRule({ type: 'any_day', day: 5, businessDayNumber: null, toleranceDays: null }),
    ).toBe('Qualquer dia, geralmente no dia 5');
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
  it('offers the three actions on a late occurrence and none on an expected expense', () => {
    expect(getOccurrenceInlineActions(createTestOccurrence({ status: 'late' }))).toEqual([
      'mark-done',
      'link',
      'edit-expected',
    ]);
    expect(getOccurrenceInlineActions(createTestOccurrence())).toEqual([]);
  });

  it('offers link first on an income that is waiting', () => {
    expect(getOccurrenceInlineActions(createTestOccurrence({ kind: 'income' }))).toEqual([
      'link',
      'mark-done',
      'edit-expected',
    ]);
    expect(
      getOccurrenceInlineActions(createTestOccurrence({ kind: 'income', status: 'partial' })),
    ).toEqual(['link', 'edit-expected']);
  });
});

describe('getOccurrenceAmount', () => {
  it('shows what came in for partial and confirmed, otherwise the expected amount', () => {
    expect(
      getOccurrenceAmount(
        createTestOccurrence({
          status: 'partial',
          receivedCents: 4_000,
          expectedAmountCents: 8_000,
        }),
      ),
    ).toEqual({ amountCents: 4_000, totalCents: 8_000 });
    expect(
      getOccurrenceAmount(createTestOccurrence({ status: 'confirmed', receivedCents: 12_990 })),
    ).toEqual({ amountCents: 12_990 });
    expect(getOccurrenceAmount(createTestOccurrence())).toEqual({ amountCents: 10_990 });
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
    expect(buildOccurrenceStatusNote(different, context)).toMatch(
      /^Cobrado R\$\s23,90, R\$\s2,00 a mais$/,
    );
    expect(buildOccurrenceStatusNote(different, { ...context, hidden: true })).toBe(
      'Cobrado R$ ••••, R$ •••• a mais',
    );
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
