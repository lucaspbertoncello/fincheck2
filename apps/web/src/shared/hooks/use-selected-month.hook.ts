import { useNavigate, useSearch } from '@tanstack/react-router';

import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { getCurrentMonthKey } from '#/shared/utils/get-current-month-key.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

/**
 * The month selected for the whole app, read from the `month` search param (`YYYY-MM`). Without
 * the param it is the current month. Changing it keeps the page and the other params.
 */
export function useSelectedMonth() {
  const search: { month?: string } = useSearch({ strict: false });
  const navigate = useNavigate();
  const month = search.month ?? getCurrentMonthKey(new Date());

  function setMonth(next: string) {
    void navigate({
      to: '.',
      search: ((previous: Record<string, unknown>) => ({ ...previous, month: next })) as never,
    });
  }

  return {
    month,
    ...formatMonthParts(month),
    goToPrevious: () => setMonth(shiftMonthKey(month, -1)),
    goToNext: () => setMonth(shiftMonthKey(month, 1)),
  };
}
