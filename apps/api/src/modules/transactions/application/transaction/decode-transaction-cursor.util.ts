import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';

// Reads back what `encodeTransactionCursor` wrote. A cursor that is not one of ours (edited by
// hand, from another list) is a 400, not a 500.
export function decodeTransactionCursor(cursor: string): [string, string, string, string] {
  try {
    const key: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
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

  throw new RequestValidationError([{ path: 'cursor', message: 'Cursor inválido.' }]);
}
