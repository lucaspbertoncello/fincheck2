import { describe, expect, it } from 'vitest';

import { describeDebtDelete } from '#/features/bills/debt-delete/utils/describe-debt-delete.util.ts';

const none = { hasOrigin: false, hasLinkedPayments: false };

describe('describeDebtDelete', () => {
  it('says only that the debt goes and has no undo when it touched no transaction', () => {
    expect(describeDebtDelete('Rafa', none)).toBe('A dívida com Rafa some e não dá para desfazer.');
    expect(describeDebtDelete(null, none)).toBe('A dívida some e não dá para desfazer.');
  });

  it('adds what happens to the origin transaction', () => {
    expect(describeDebtDelete('Júlia', { ...none, hasOrigin: true })).toBe(
      'A dívida com Júlia some e não dá para desfazer. A transação de origem volta a ser despesa inteira, sem categoria.',
    );
  });

  it('adds what happens to the payments tied to transactions', () => {
    expect(describeDebtDelete('Rafa', { ...none, hasLinkedPayments: true })).toBe(
      'A dívida com Rafa some e não dá para desfazer. Os pagamentos ligados a transações voltam a ser transações comuns.',
    );
  });

  it('adds both, the origin first', () => {
    const text = describeDebtDelete('Júlia', { hasOrigin: true, hasLinkedPayments: true });

    expect(text.indexOf('origem')).toBeGreaterThan(0);
    expect(text.indexOf('origem')).toBeLessThan(text.indexOf('pagamentos'));
  });
});
