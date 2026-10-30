import { describe, expect, it } from 'vitest';

import {
  businessDateSchema,
  instantSchema,
  monthQuerySchema,
  monthSchema,
} from '#/common/date/date.schema.ts';

describe('businessDateSchema', () => {
  it('accepts a real date, leap day included', () => {
    expect(businessDateSchema.safeParse('2026-10-22').success).toBe(true);
    expect(businessDateSchema.safeParse('2028-02-29').success).toBe(true);
  });

  it('refuses impossible dates and other shapes', () => {
    expect(businessDateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(businessDateSchema.safeParse('2027-02-29').success).toBe(false);
    expect(businessDateSchema.safeParse('22/10/2026').success).toBe(false);
    expect(businessDateSchema.safeParse('2026-10-22T00:00:00.000Z').success).toBe(false);
  });
});

describe('monthSchema', () => {
  it('accepts YYYY-MM only', () => {
    expect(monthSchema.safeParse('2026-10').success).toBe(true);
    expect(monthSchema.safeParse('2026-13').success).toBe(false);
    expect(monthSchema.safeParse('2026-00').success).toBe(false);
    expect(monthSchema.safeParse('2026-10-01').success).toBe(false);
  });
});

describe('instantSchema', () => {
  it('requires ISO 8601 in UTC', () => {
    expect(instantSchema.safeParse('2026-10-22T13:05:00.000Z').success).toBe(true);
    expect(instantSchema.safeParse('2026-10-22T13:05:00-03:00').success).toBe(false);
    expect(instantSchema.safeParse('2026-10-22').success).toBe(false);
  });
});

describe('monthQuerySchema', () => {
  it('needs the month', () => {
    expect(monthQuerySchema.safeParse({}).success).toBe(false);
    expect(monthQuerySchema.parse({ month: '2026-10' })).toEqual({ month: '2026-10' });
  });
});
