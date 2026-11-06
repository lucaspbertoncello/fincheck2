import { describe, expect, it } from 'vitest';

import { describeReceivedIn } from '#/features/transactions/transaction-list/utils/describe-received-in.util.ts';
import { describeEmptyPeriod } from '#/features/transactions/transaction-list/utils/describe-empty-period.util.ts';
import { describePreviousPeriod } from '#/features/transactions/transaction-list/utils/describe-previous-period.util.ts';
import { resolvePeriodRange } from '#/shared/utils/transactions/resolve-period-range.util.ts';

describe('words of a period', () => {
  const twelve = resolvePeriodRange('12m', '2026-10-22');
  const year = resolvePeriodRange('year', '2026-10-22');

  it('names the period before, and has none for "Tudo"', () => {
    expect(describePreviousPeriod('12m', twelve)).toBe('os 12 meses antes');
    expect(describePreviousPeriod('year', year)).toBe('2025');
    expect(describePreviousPeriod('all', {})).toBeNull();
  });

  it('titles the empty screen by period', () => {
    expect(describeEmptyPeriod('month', {}, 'outubro')).toBe('Nenhuma transação em outubro ainda');
    expect(describeEmptyPeriod('12m', twelve, 'outubro')).toBe(
      'Nenhuma transação nos últimos 12 meses',
    );
    expect(describeEmptyPeriod('year', year, 'outubro')).toBe('Nenhuma transação em 2026 ainda');
    expect(describeEmptyPeriod('all', {}, 'outubro')).toBe('Nenhuma transação ainda');
  });

  it('words the legend of the received income', () => {
    expect(describeReceivedIn('12m')).toBe('Recebido nos últimos 12 meses');
    expect(describeReceivedIn('year')).toBe('Recebido no ano');
    expect(describeReceivedIn('all')).toBe('Recebido em todo o histórico');
  });
});
