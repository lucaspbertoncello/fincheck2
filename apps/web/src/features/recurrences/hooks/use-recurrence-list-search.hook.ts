import { useNavigate, useSearch } from '@tanstack/react-router';

import {
  recurrenceListSearchSchema,
  type RecurrenceListSearch,
} from '#/features/recurrences/schemas/recurrence-list-search.schema.ts';

type Flow = NonNullable<RecurrenceListSearch['flow']>;

/**
 * The screen state that lives in the URL: side, chosen day and open modal. Each setter keeps
 * `month` and the other params; the modals are opened with `push` so "Voltar" closes them.
 */
export function useRecurrenceListSearch() {
  const rawSearch: Record<string, unknown> = useSearch({ strict: false });
  const search = recurrenceListSearchSchema.parse(rawSearch);
  const navigate = useNavigate();

  function update(
    changes: Partial<Record<keyof RecurrenceListSearch, string | undefined>>,
    replace = false,
  ) {
    void navigate({
      to: '.',
      replace,
      search: ((previous: Record<string, unknown>) => ({ ...previous, ...changes })) as never,
    });
  }

  return {
    ...search,
    /** The chosen side; without `?flow` the screen shows the expenses. */
    flow: (search.flow ?? 'expense') satisfies Flow,
    selectFlow: (flow: Flow) => update({ flow }, true),
    selectDay: (day: string) => update({ day }, true),
    openNew: () => update({ new: 'recurrence' }),
    openNewSubscription: () => update({ new: 'subscription' }),
    openEdit: (recurrenceId: string) => update({ edit: recurrenceId }),
    openLink: (occurrenceId: string) => update({ link: occurrenceId }),
    openExpected: (occurrenceId: string) => update({ expected: occurrenceId }),
    closeModals: () =>
      update({ new: undefined, edit: undefined, link: undefined, expected: undefined }, true),
  };
}
