import { isApiError } from '#/shared/api/api.error.ts';

const MAX_RETRIES = 3;

/** Retries a failed read, but not when the API already answered with a 4xx: asking again changes nothing. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false;

  return failureCount < MAX_RETRIES;
}
