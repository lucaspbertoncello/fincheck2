import { describe, expect, it } from 'vitest';

import { buildSubscriptionName } from '#/modules/recurrences/domain/subscription/build-subscription-name.util.ts';

describe('buildSubscriptionName', () => {
  it('capitalizes each word and cuts at 80', () => {
    expect(buildSubscriptionName('STREAMFLIX PREMIUM')).toBe('Streamflix Premium');
    expect(buildSubscriptionName('x'.repeat(100))).toHaveLength(80);
  });

  it('takes the "*" of the card out and keeps one space between the words', () => {
    expect(buildSubscriptionName('GOOGLE *YOUTUBEMUSIC')).toBe('Google Youtubemusic');
    expect(buildSubscriptionName('  PAG*  NETFLIX ')).toBe('Pag Netflix');
  });
});
