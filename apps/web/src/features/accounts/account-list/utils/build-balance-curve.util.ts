import type { BalanceHistory } from '@fincheck/shared/accounts/balance-history/balance-history.type.ts';
import type { ChartPoint } from '@fincheck/ui';

/** The month history as the chart wants it: the day of the month and the balance in cents. */
export function buildBalanceCurve(history: BalanceHistory.Dto | undefined): ChartPoint[] {
  return (history?.points ?? []).map((point) => ({
    day: Number(point.date.slice(8, 10)),
    cents: point.balanceCents,
  }));
}
