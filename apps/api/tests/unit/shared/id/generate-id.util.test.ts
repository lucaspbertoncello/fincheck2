import { idSchema } from '@fincheck/shared/common/id/id.schema.ts';
import { describe, expect, it } from 'vitest';

import { generateId } from '#/shared/id/generate-id.util.ts';

describe('generateId', () => {
  it('makes a UUID of version 7 and variant 10', () => {
    const id = generateId();

    expect(idSchema.safeParse(id).success).toBe(true);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('carries the time in the first 48 bits', () => {
    const timestamp = Date.UTC(2031, 0, 1);
    const id = generateId(timestamp);

    expect(Number.parseInt(id.replace('-', '').slice(0, 12), 16)).toBe(timestamp);
  });

  it('is unique and sorts by creation order, also inside one millisecond', () => {
    const timestamp = Date.UTC(2040, 5, 1);
    const ids = Array.from({ length: 5000 }, () => generateId(timestamp));

    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it('sorts a later time after an earlier one', () => {
    const early = generateId(Date.UTC(2050, 0, 1));
    const late = generateId(Date.UTC(2050, 0, 2));

    expect(early < late).toBe(true);
  });
});
