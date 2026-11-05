import { useNavigate } from '@tanstack/react-router';

/**
 * The screen state that lives in the URL: the recurrence modals the tab opens. The form is the one
 * of Recorrências, so the params are its own: `?edit=<recurrenceId>` and `?new=recurrence`. Each
 * setter keeps `month`; opening pushes, so "Voltar" closes the modal.
 */
export function useSubscriptionListSearch() {
  const navigate = useNavigate();

  function update(changes: Record<string, string | undefined>) {
    void navigate({
      to: '.',
      search: ((previous: Record<string, unknown>) => ({ ...previous, ...changes })) as never,
    });
  }

  return {
    openEdit: (recurrenceId: string) => update({ edit: recurrenceId }),
    openNew: () => update({ new: 'recurrence' }),
  };
}
