import { isApiError } from '#/shared/api/api.error.ts';

/** True when the API answered that the thing asked for is not there: 404, or 400 for a malformed id. */
export function isMissingApiError(error: unknown): boolean {
  return isApiError(error) && (error.status === 404 || error.status === 400);
}
