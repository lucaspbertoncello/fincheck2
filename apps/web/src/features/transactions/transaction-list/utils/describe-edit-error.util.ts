import type { TransactionEditField } from '@fincheck/ui';

import { isApiError } from '#/shared/api/api.error.ts';
import { describeTransactionError } from '#/shared/utils/transactions/describe-transaction-error.util.ts';

const BY_CODE: Record<string, { field?: TransactionEditField; message: string }> = {
  TRANSACTION_LINKED_TO_BILL: {
    message:
      'Essa transação está ligada a uma conta a pagar ou a receber. Para mudar o tipo (ou o valor, se ela for o gasto que originou a dívida), desfaça o vínculo antes.',
  },
  TRANSACTION_LINKED_TO_OCCURRENCE: {
    message:
      'Essa transação está ligada a uma recorrência. Para mudar o tipo, desligue o vínculo antes.',
  },
};

/** What to tell the person when the edit of a transaction fails: the links the API protects, then the common cases. */
export function describeEditError(error: unknown): {
  field?: TransactionEditField;
  message: string;
} {
  if (isApiError(error)) {
    const known = BY_CODE[error.code];
    if (known) return known;
  }

  return describeTransactionError(error);
}
