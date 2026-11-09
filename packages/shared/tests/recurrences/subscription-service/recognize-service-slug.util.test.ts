import { describe, expect, it } from 'vitest';

import { recognizeServiceSlug } from '#/recurrences/subscription-service/recognize-service-slug.util.ts';
import {
  SUBSCRIPTION_SERVICE_PATTERNS,
  SUBSCRIPTION_SERVICES,
} from '#/recurrences/subscription-service/subscription-service.constant.ts';

describe('recognizeServiceSlug', () => {
  it.each([
    ['NETFLIX.COM', 'netflix'],
    ['GOOGLE *YOUTUBEPREMIUM', 'youtube'],
    ['GOOGLE *YOUTUBE MUSIC', 'youtubemusic'],
    ['Spotify AB', 'spotify'],
    ['DISNEY PLUS', 'disneyplus'],
    ['Disney+', 'disneyplus'],
    ['PRIME VIDEO BR', 'primevideo'],
    ['OPENAI *CHATGPT SUBSCR', 'chatgpt'],
    ['GITHUB COPILOT', 'githubcopilot'],
    ['Z.AI GLM CODING PLAN', 'zdotai'],
  ])('knows %s as %s', (description, slug) => {
    expect(recognizeServiceSlug(description)).toBe(slug);
  });

  it.each([
    ['ANTHROPIC', 'claude'],
    ['AMAZON PRIME BR', 'primevideo'],
    ['AMZN MUSIC', 'amazonmusic'],
    ['HBO', 'hbomax'],
    ['MAX', 'hbomax'],
    ['MAX STREAMING', 'hbomax'],
    ['GLM', 'zdotai'],
    ['ZHIPU', 'zdotai'],
    ['XAI', 'grok'],
    ['LE CHAT', 'mistralai'],
  ])('knows the description %s that the front always knew, as %s', (description, slug) => {
    expect(recognizeServiceSlug(description)).toBe(slug);
  });

  it('prefers the narrower name: YouTube Music is not YouTube Premium', () => {
    expect(recognizeServiceSlug('YOUTUBE MUSIC')).toBe('youtubemusic');
  });

  it('has patterns for every service of the list, once each', () => {
    const slugs = SUBSCRIPTION_SERVICE_PATTERNS.map((service) => service.slug);
    expect([...slugs].sort()).toEqual(SUBSCRIPTION_SERVICES.map((service) => service.slug).sort());
  });

  it('gives null when no text names a service, and for a short name that is only part of a word', () => {
    expect(recognizeServiceSlug('PLANO CELULAR', null, undefined, '')).toBeNull();
    expect(recognizeServiceSlug()).toBeNull();
    expect(recognizeServiceSlug('LOJA DO ZE')).toBeNull();
    expect(recognizeServiceSlug('MAXXY PAGAMENTOS')).toBeNull();
  });

  it('takes the first text that names a service', () => {
    expect(recognizeServiceSlug('Assinatura', 'SPOTIFY', 'NETFLIX')).toBe('spotify');
  });
});
