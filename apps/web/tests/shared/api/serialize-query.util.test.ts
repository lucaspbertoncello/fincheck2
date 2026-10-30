import { describe, expect, it } from 'vitest';

import { serializeQuery } from '#/shared/api/serialize-query.util.ts';

describe('serializeQuery', () => {
  it('turns values into text and leaves out undefined and null', () => {
    expect(
      serializeQuery({
        month: '2026-10',
        uncategorized: true,
        limit: 50,
        cursor: undefined,
        x: null,
      }),
    ).toEqual({ month: '2026-10', uncategorized: 'true', limit: '50' });
  });
});
