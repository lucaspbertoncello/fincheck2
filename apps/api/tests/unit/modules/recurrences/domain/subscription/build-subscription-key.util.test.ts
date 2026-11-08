import { describe, expect, it } from 'vitest';

import { buildSubscriptionKey } from '#/modules/recurrences/domain/subscription/build-subscription-key.util.ts';
import { parseSubscriptionKey } from '#/modules/recurrences/domain/subscription/parse-subscription-key.util.ts';

describe('buildSubscriptionKey and parseSubscriptionKey', () => {
  it('joins the normalized description (no installment, no accent, no case) and the card', () => {
    expect(buildSubscriptionKey('Netflix.com 03/12', 'card-1')).toBe('NETFLIX.COM|card-1');
    expect(buildSubscriptionKey('  Café  Premium ', 'card-1')).toBe('CAFE PREMIUM|card-1');
  });

  it('splits it back at the last bar, even when the description has one', () => {
    expect(parseSubscriptionKey('NETFLIX.COM|card-1')).toEqual({
      pattern: 'NETFLIX.COM',
      accountId: 'card-1',
    });
    expect(parseSubscriptionKey('A|B|card-1')).toEqual({ pattern: 'A|B', accountId: 'card-1' });
  });

  it('refuses a key with no usable bar', () => {
    expect(parseSubscriptionKey('NETFLIX')).toBeNull();
    expect(parseSubscriptionKey('|card-1')).toBeNull();
    expect(parseSubscriptionKey('NETFLIX|')).toBeNull();
  });
});
