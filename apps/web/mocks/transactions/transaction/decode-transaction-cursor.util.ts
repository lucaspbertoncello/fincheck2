import type { TransactionCursorKey } from '#mocks/transactions/transaction/encode-transaction-cursor.util.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

// Reads back what `encodeTransactionCursor` wrote. A cursor the mock did not emit is a 400, like
// in the API (`mock vs api.md` 5).
export function decodeTransactionCursor(cursor: string): TransactionCursorKey {
  try {
    const key: unknown = JSON.parse(atob(cursor.replaceAll('-', '+').replaceAll('_', '/')));
    if (
      Array.isArray(key) &&
      key.length === 4 &&
      key.every((part): part is string => typeof part === 'string')
    ) {
      return [key[0] as string, key[1] as string, key[2] as string, key[3] as string];
    }
  } catch {
    // falls through to the error below
  }

  return fail(400, 'VALIDATION_FAILED', 'Cursor inválido.', {
    issues: [{ path: 'cursor', message: 'Cursor inválido.' }],
  });
}
