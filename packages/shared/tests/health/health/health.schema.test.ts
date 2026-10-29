import { describe, expect, it } from 'vitest';

import { healthDtoSchema } from '#/health/health/health.schema.ts';

describe('healthDtoSchema', () => {
  it('accepts a healthy response', () => {
    expect(healthDtoSchema.parse({ status: 'ok', database: 'ok' })).toEqual({
      status: 'ok',
      database: 'ok',
    });
  });

  it('rejects an unknown status', () => {
    expect(healthDtoSchema.safeParse({ status: 'down', database: 'ok' }).success).toBe(false);
  });
});
