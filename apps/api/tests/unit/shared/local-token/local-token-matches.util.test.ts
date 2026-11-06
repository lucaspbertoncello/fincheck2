import { describe, expect, it } from 'vitest';

import { localTokenMatches } from '#/shared/local-token/local-token-matches.util.ts';

describe('localTokenMatches', () => {
  it('accepts the same token', () => {
    expect(localTokenMatches('abc123', 'abc123')).toBe(true);
  });

  it.each([undefined, '', 'abc124', 'abc12', 'abc1234', 'ABC123'])('refuses %j', (received) => {
    expect(localTokenMatches(received, 'abc123')).toBe(false);
  });
});
