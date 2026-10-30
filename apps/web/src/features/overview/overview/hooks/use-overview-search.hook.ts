import { useNavigate, useSearch } from '@tanstack/react-router';

import {
  overviewSearchSchema,
  type OverviewSearch,
} from '#/features/overview/overview/schemas/overview-search.schema.ts';

/**
 * The screen state that lives in the URL, read through the screen's own schema. `setStrip` keeps
 * the month and the other params and leaves the default view ("day") out of the URL.
 */
export function useOverviewSearch() {
  const rawSearch: Record<string, unknown> = useSearch({ strict: false });
  const search = overviewSearchSchema.parse(rawSearch);
  const navigate = useNavigate();

  function setStrip(strip: OverviewSearch['strip']) {
    void navigate({
      to: '.',
      replace: true,
      search: ((previous: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...previous, strip };
        if (strip === 'day') delete next['strip'];
        return next;
      }) as never,
    });
  }

  return { ...search, setStrip };
}
