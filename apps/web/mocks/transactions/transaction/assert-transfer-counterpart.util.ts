import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { assertNatureChange } from '#mocks/transactions/transaction/assert-nature-change.util.ts';

// The checks of the API when a transaction takes another one as the other leg of its transfer
// (`Transaction.linkTransfer`): another account, the opposite value and, when the other leg is not
// a transfer yet, the same nature rules of any change to `transfer`.
export function assertTransferCounterpart(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
  other: MockState.TransactionRecord,
): void {
  if (tx.id === other.id || tx.accountId === other.accountId)
    fail(400, 'VALIDATION_FAILED', 'A outra perna de uma transferência está em outra conta.', {
      issues: [{ path: 'transferCounterpartId', message: 'Another account is needed' }],
    });
  if (tx.amountCents + other.amountCents !== 0)
    fail(400, 'VALIDATION_FAILED', 'A outra perna precisa ter o valor oposto.', {
      issues: [{ path: 'transferCounterpartId', message: 'The value has to be the opposite' }],
    });
  if (other.nature !== 'transfer') assertNatureChange(database, other, 'transfer');
}
