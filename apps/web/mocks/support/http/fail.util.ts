import { MockApiError } from '#mocks/support/http/mock-api.error.ts';

// Stops the handler and makes the mock answer with this error.
export function fail(
  status: number,
  code: string,
  message?: string,
  details?: Record<string, unknown>,
): never {
  throw new MockApiError(status, code, message, details);
}
