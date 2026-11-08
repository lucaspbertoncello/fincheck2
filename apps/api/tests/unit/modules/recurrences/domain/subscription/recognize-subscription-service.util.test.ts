import { SUBSCRIPTION_SERVICES } from '@fincheck/shared/recurrences/subscription-service/subscription-service.constant.ts';
import { describe, expect, it } from 'vitest';

import { recognizeSubscriptionService } from '#/modules/recurrences/domain/subscription/recognize-subscription-service.util.ts';

describe('recognizeSubscriptionService', () => {
  it.each([
    ['NETFLIX.COM', 'netflix'],
    ['GOOGLE *YOUTUBEPREMIUM', 'youtube'],
    ['Spotify AB', 'spotify'],
    ['DISNEY PLUS', 'disneyplus'],
    ['PRIME VIDEO BR', 'primevideo'],
    ['OPENAI *CHATGPT SUBSCR', 'chatgpt'],
    ['GITHUB COPILOT', 'githubcopilot'],
  ])('knows %s as %s', (description, slug) => {
    expect(recognizeSubscriptionService(description)).toBe(slug);
  });

  it('prefers the longest name: YouTube Music is not YouTube Premium', () => {
    expect(recognizeSubscriptionService('YOUTUBE MUSIC')).toBe('youtubemusic');
  });

  it('returns null when no service is named, and for a short name that is only part of a word', () => {
    expect(recognizeSubscriptionService('LOJA DO ZE')).toBeNull();
    expect(recognizeSubscriptionService('MAXXY PAGAMENTOS')).toBeNull();
  });

  it('only answers slugs of the shared list', () => {
    const slugs = new Set<string>(SUBSCRIPTION_SERVICES.map((service) => service.slug));

    for (const description of ['NETFLIX', 'SPOTIFY', 'DEEZER', 'TIDAL', 'GROK', 'MIDJOURNEY']) {
      expect(slugs.has(recognizeSubscriptionService(description) ?? '')).toBe(true);
    }
  });
});
