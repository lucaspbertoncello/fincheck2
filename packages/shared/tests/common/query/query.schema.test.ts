import { describe, expect, it } from 'vitest';

import { queryBooleanSchema } from '#/common/query/query.schema.ts';

describe('queryBooleanSchema', () => {
  it('turns the text true and false into booleans', () => {
    expect(queryBooleanSchema.parse('true')).toBe(true);
    expect(queryBooleanSchema.parse('false')).toBe(false);
  });

  it('refuses anything else', () => {
    expect(queryBooleanSchema.safeParse('1').success).toBe(false);
    expect(queryBooleanSchema.safeParse(true).success).toBe(false);
  });
});
