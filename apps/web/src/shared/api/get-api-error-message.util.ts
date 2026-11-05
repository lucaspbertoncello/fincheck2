import { isApiError } from '#/shared/api/api.error.ts';

/** The message the API sent with the error; `fallback` for anything else (network, bug, unknown). */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}
