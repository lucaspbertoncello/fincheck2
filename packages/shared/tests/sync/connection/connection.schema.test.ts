import { describe, expect, it } from 'vitest';

import { CONNECTION_STALE_AFTER_HOURS } from '#/sync/connection/connection.constant.ts';
import {
  connectionErrorCodeSchema,
  createConnectionRequestSchema,
} from '#/sync/connection/connection.schema.ts';

describe('createConnectionRequestSchema', () => {
  it('wants the Pluggy item id with 36 characters', () => {
    expect(
      createConnectionRequestSchema.safeParse({
        pluggyItemId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      }).success,
    ).toBe(true);
    expect(createConnectionRequestSchema.safeParse({ pluggyItemId: 'abc' }).success).toBe(false);
  });
});

describe('connectionErrorCodeSchema', () => {
  it('has only the four translated codes, never the raw message', () => {
    expect(connectionErrorCodeSchema.options).toEqual([
      'CONSENT_REVOKED',
      'LOGIN_ERROR',
      'STALE_DATA',
      'PROVIDER_ERROR',
    ]);
  });

  it('marks data stale after 36 hours', () => {
    expect(CONNECTION_STALE_AFTER_HOURS).toBe(36);
  });
});
