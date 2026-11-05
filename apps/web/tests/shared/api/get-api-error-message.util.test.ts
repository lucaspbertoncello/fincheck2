import { describe, expect, it } from 'vitest';

import { ApiError } from '#/shared/api/api.error.ts';
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';

describe('getApiErrorMessage', () => {
  it('uses the message of an ApiError', () => {
    expect(getApiErrorMessage(new ApiError(409, 'CONFLICT', 'Já existe.'), 'Tente de novo.')).toBe(
      'Já existe.',
    );
  });

  it('falls back for any other error', () => {
    expect(getApiErrorMessage(new Error('boom'), 'Tente de novo.')).toBe('Tente de novo.');
    expect(getApiErrorMessage(undefined, 'Tente de novo.')).toBe('Tente de novo.');
  });
});
