import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { billQueries } from '#/domain/bills/bill/queries/bill.query.ts';
import type { DebtDeleteTarget } from '#/features/bills/debt-delete/debt-delete.model.ts';
import { useBillSearch } from '#/features/bills/hooks/use-bill-search.hook.ts';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';

type DebtActionsArgs = {
  /** The sentence of an action that failed, for the screen to show. */
  onError: (message: string) => void;
};

/**
 * What the "…" of a friend debt does, the same on the Amigos tab and on A pagar e receber:
 * "Editar" opens the debt form (`?debt=<id>`), or the transaction the debt came from when it has
 * one (that is where it is undone); "Excluir" sets the target of the confirmation dialog.
 */
export function useDebtActions({ onError }: DebtActionsArgs) {
  const search = useBillSearch();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { monthParam } = useActiveScreen();
  const [deleteTarget, setDeleteTarget] = useState<DebtDeleteTarget | null>(null);

  async function edit(billId: string) {
    try {
      const bill = await queryClient.ensureQueryData(billQueries.detail(billId));
      if (bill.origin) {
        const path = `/transactions?edit=${encodeURIComponent(bill.origin.transactionId)}`;
        navigateToHref(router, buildHref(path, monthParam));
      } else {
        search.openEditDebt(billId);
      }
    } catch (error) {
      onError(describeApiError(error));
    }
  }

  // The confirmation says what the delete does to the transactions the debt is tied to, so it reads
  // the debt fresh first (a payment may have been linked since the list was loaded).
  async function askDelete(debt: { billId: string; person: string | null }) {
    try {
      const bill = await queryClient.fetchQuery({
        ...billQueries.detail(debt.billId),
        staleTime: 0,
      });
      setDeleteTarget({
        ...debt,
        effects: {
          hasOrigin: bill.origin !== null,
          hasLinkedPayments: bill.payments.some((payment) => payment.transactionId !== null),
        },
      });
    } catch (error) {
      onError(describeApiError(error));
    }
  }

  return {
    edit,
    deleteTarget,
    askDelete,
    closeDelete: () => setDeleteTarget(null),
  };
}
