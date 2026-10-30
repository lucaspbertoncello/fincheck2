import { useNavigate, useSearch } from '@tanstack/react-router';

import {
  accountsSearchSchema,
  type AccountsSearch,
} from '#/features/accounts/account-search/schemas/accounts-search.schema.ts';

/** Reads the screen state of Contas e cartões from the URL and changes it, keeping the month. */
export function useAccountsSearch() {
  const raw: Record<string, unknown> = useSearch({ strict: false });
  const navigate = useNavigate();
  const search = accountsSearchSchema.parse(raw);

  function update(patch: Partial<Record<keyof AccountsSearch, string | undefined>>) {
    void navigate({
      to: '.',
      search: ((previous: Record<string, unknown>) => ({ ...previous, ...patch })) as never,
    });
  }

  return { search, update };
}
