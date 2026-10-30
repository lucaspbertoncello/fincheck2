import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAgenda } from '#/domain/dashboard/agenda/hooks/use-agenda.hook.ts';
import { useCategoryBreakdown } from '#/domain/dashboard/category-breakdown/hooks/use-category-breakdown.hook.ts';
import { useFreeBalance } from '#/domain/dashboard/free-balance/hooks/use-free-balance.hook.ts';
import { useMonthSummary } from '#/domain/dashboard/month-summary/hooks/use-month-summary.hook.ts';
import { useSpendingCurve } from '#/domain/dashboard/spending-curve/hooks/use-spending-curve.hook.ts';
import { useTimeline } from '#/domain/dashboard/timeline/hooks/use-timeline.hook.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/clock.constant.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

// The dashboard only reads; what changes it is the money mutations of the other contexts (see the
// transactions, bills and recurrences tests, and the ledger test).
describe('dashboard domain', () => {
  it('reads every panel for the month', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        free: useFreeBalance(),
        summary: useMonthSummary(CURRENT_MONTH),
        curve: useSpendingCurve(CURRENT_MONTH),
        breakdown: useCategoryBreakdown(CURRENT_MONTH),
        timeline: useTimeline(CURRENT_MONTH),
        recurringTimeline: useTimeline(CURRENT_MONTH, 'recurrences'),
        agenda: useAgenda(CURRENT_MONTH),
      }),
      { wrapper },
    );
    await waitFor(() => {
      for (const query of Object.values(result.current)) expect(query.isSuccess).toBe(true);
    });

    expect(result.current.summary.data?.month).toBe(CURRENT_MONTH);
  });
});
