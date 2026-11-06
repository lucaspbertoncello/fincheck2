import { useNavigate, useSearch } from '@tanstack/react-router';

import {
  profileSearchSchema,
  type ProfileSearch,
} from '#/features/profile/profile/schemas/profile-search.schema.ts';

/** Reads which modal of Perfil is open from the URL and changes it, keeping the month. */
export function useProfileSearch() {
  const raw: Record<string, unknown> = useSearch({ strict: false });
  const navigate = useNavigate();
  const search = profileSearchSchema.parse(raw);

  function update(patch: Partial<Record<keyof ProfileSearch, string | undefined>>) {
    void navigate({
      to: '.',
      search: ((previous: Record<string, unknown>) => ({ ...previous, ...patch })) as never,
    });
  }

  return { search, update };
}
