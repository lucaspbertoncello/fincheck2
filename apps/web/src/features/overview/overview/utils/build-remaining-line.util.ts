import type { MonthSummary } from '@fincheck/shared/dashboard/month-summary/month-summary.type.ts';
import type { RemainingLineData } from '@fincheck/ui';

/** "Faltam 10 dias · ainda entram · ainda saem". Only the current month has it (BR-DSH-012). */
export function buildRemainingLine(summary: MonthSummary.Dto): RemainingLineData | undefined {
  if (!summary.remaining) return undefined;
  return {
    daysLeft: summary.remaining.daysRemaining,
    incomeCents: summary.remaining.incomingCents,
    expenseCents: summary.remaining.outgoingCents,
  };
}
