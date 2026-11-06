import { useState } from 'react';

import { describeTransactionError } from '#/shared/utils/transactions/describe-transaction-error.util.ts';

/** The message of the last action that failed, shown above the list until closed or retried. */
export function useActionError() {
  const [message, setMessage] = useState<string | null>(null);

  return {
    message,
    report: (error: unknown) => setMessage(describeTransactionError(error).message),
    clear: () => setMessage(null),
  };
}
