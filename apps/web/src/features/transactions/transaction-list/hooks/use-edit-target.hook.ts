import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { useToast } from '@fincheck/ui';
import { useEffect } from 'react';

import { useTransaction } from '#/domain/transactions/transaction/hooks/use-transaction.hook.ts';
import { isMissingApiError } from '#/shared/api/is-missing-api-error.util.ts';

type EditTargetArgs = {
  /** The `?edit=` of the address. */
  id: string | undefined;
  /** The transaction when the screen already has it in a list. */
  found: Transaction.Dto | undefined;
  /** Takes `?edit=` out of the address. */
  clear: () => void;
};

/**
 * The transaction `?edit=` points to: the one the lists hold, or else the one the API gives by id
 * (it can be outside the page loaded). An id that does not exist leaves the address and says so.
 */
export function useEditTarget({ id, found, clear }: EditTargetArgs): Transaction.Dto | undefined {
  const { showUndoToast } = useToast();
  const fetched = useTransaction(id ?? '', { enabled: Boolean(id) && !found });
  const isMissing = Boolean(id) && !found && isMissingApiError(fetched.error);

  useEffect(() => {
    if (!isMissing) return;
    clear();
    showUndoToast({
      message: 'Essa transação não existe mais.',
      actionLabel: 'Ok',
      onUndo: () => undefined,
      timeout: 4000,
    });
    // Runs once per missing id: `clear` and the toast are new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMissing, id]);

  return found ?? (id ? fetched.data : undefined);
}
