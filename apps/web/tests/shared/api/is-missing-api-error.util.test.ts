import { describe, expect, it } from 'vitest';

import { ApiError } from '#/shared/api/api.error.ts';
import { isMissingApiError } from '#/shared/api/is-missing-api-error.util.ts';
import { shouldRetryQuery } from '#/shared/api/should-retry-query.util.ts';

describe('isMissingApiError', () => {
  it('is true for 404 and for 400 (malformed id), false for the rest', () => {
    expect(isMissingApiError(new ApiError(404, 'CARD_NOT_FOUND', 'x'))).toBe(true);
    expect(isMissingApiError(new ApiError(400, 'VALIDATION_FAILED', 'x'))).toBe(true);
    expect(isMissingApiError(new ApiError(500, 'UNKNOWN_ERROR', 'x'))).toBe(false);
    expect(isMissingApiError(new Error('network'))).toBe(false);
  });
});

describe('shouldRetryQuery', () => {
  it('does not retry a 4xx, retries other failures up to three times', () => {
    expect(shouldRetryQuery(0, new ApiError(404, 'CARD_NOT_FOUND', 'x'))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(500, 'UNKNOWN_ERROR', 'x'))).toBe(true);
    expect(shouldRetryQuery(2, new Error('network'))).toBe(true);
    expect(shouldRetryQuery(3, new Error('network'))).toBe(false);
  });
});
