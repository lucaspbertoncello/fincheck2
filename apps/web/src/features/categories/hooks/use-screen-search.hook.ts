import { useNavigate, useSearch } from '@tanstack/react-router';
import type { z } from 'zod';

/**
 * The screen state that lives in the URL (filter, open modal): parses the current search with the
 * screen's schema and gives back `update`, which changes some params and keeps the rest (month
 * included). A `undefined` value removes the param.
 */
export function useScreenSearch<Schema extends z.ZodType>(schema: Schema) {
  const raw: unknown = useSearch({ strict: false });
  const navigate = useNavigate();
  const search = schema.parse(raw ?? {});

  function update(patch: Record<string, string | undefined>) {
    void navigate({
      to: '.',
      search: ((previous: Record<string, unknown>) => ({ ...previous, ...patch })) as never,
    });
  }

  return { search, update };
}
