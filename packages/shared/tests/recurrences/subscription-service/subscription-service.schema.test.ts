import { describe, expect, it } from 'vitest';

import {
  SUBSCRIPTION_SERVICE_SLUGS,
  SUBSCRIPTION_SERVICES,
} from '#/recurrences/subscription-service/subscription-service.constant.ts';
import { subscriptionServiceSlugSchema } from '#/recurrences/subscription-service/subscription-service.schema.ts';

describe('subscription services (BR-REC-017)', () => {
  it('lists the 25 services in the order of the rule, one slug each', () => {
    expect(SUBSCRIPTION_SERVICES.map((service) => service.name)).toEqual([
      ...['Netflix', 'YouTube Premium', 'Max', 'Disney+', 'Prime Video', 'Apple TV+'],
      ...['Globoplay', 'Paramount+', 'Crunchyroll'],
      ...['Spotify', 'YouTube Music', 'Apple Music', 'Deezer', 'Amazon Music', 'Tidal'],
      ...['ChatGPT', 'Claude', 'Gemini', 'DeepSeek', 'GLM', 'Perplexity', 'Grok', 'Mistral'],
      ...['GitHub Copilot', 'Midjourney'],
    ]);
    expect(new Set(SUBSCRIPTION_SERVICES.map((service) => service.slug)).size).toBe(25);
  });

  it('keeps the slug list and the service list in step', () => {
    expect(SUBSCRIPTION_SERVICES.map((service) => service.slug)).toEqual([
      ...SUBSCRIPTION_SERVICE_SLUGS,
    ]);
  });

  it('accepts a known slug and refuses any other text', () => {
    expect(subscriptionServiceSlugSchema.safeParse('hbomax').success).toBe(true);
    expect(subscriptionServiceSlugSchema.safeParse('Netflix').success).toBe(false);
    expect(subscriptionServiceSlugSchema.safeParse('').success).toBe(false);
  });
});
