import { useNavigate, useSearch } from '@tanstack/react-router';

import {
  transactionListSearchSchema,
  type TransactionListSearch,
} from '#/shared/schemas/transactions/transaction-list-search.schema.ts';

type SearchPatch = { [Key in keyof TransactionListSearch]?: TransactionListSearch[Key] | null };

/**
 * The screen state that lives in the URL (view, type, search, filters, open panel, creation modal),
 * read through the screen's own schema. `update` changes some keys and keeps the rest, including the
 * month and the period of the screen; `null` or `undefined` removes a key. Default values stay out of the URL.
 */
export function useTransactionListSearch() {
  const rawSearch = useSearch({ strict: false });
  const navigate = useNavigate();
  const search = transactionListSearchSchema.parse(rawSearch);

  function update(patch: SearchPatch) {
    void navigate({
      to: '.',
      replace: true,
      search: ((previous: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...previous, ...patch };
        for (const key of Object.keys(next)) {
          if (next[key] === null || next[key] === undefined) delete next[key];
        }
        if (next['view'] === 'list') delete next['view'];
        if (next['type'] === 'all') delete next['type'];
        if (next['period'] === 'month') delete next['period'];
        return next;
      }) as never,
    });
  }

  return { search, update };
}
