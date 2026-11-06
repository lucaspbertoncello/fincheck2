import { SUBSCRIPTION_SERVICES } from '@fincheck/shared/recurrences/subscription-service/subscription-service.constant.ts';
import { describe, expect, it } from 'vitest';

import { SERVICE_PATTERNS } from '#/domain/recurrences/service-logo/constants/service-patterns.constant.ts';
import { recognizeServiceSlug } from '#/domain/recurrences/service-logo/rules/recognize-service-slug.rule.ts';

describe('recognizeServiceSlug', () => {
  it('answers the slug of the shared list', () => {
    expect(recognizeServiceSlug('NETFLIX.COM')).toBe('netflix');
    expect(recognizeServiceSlug('GOOGLE *YOUTUBE MUSIC')).toBe('youtubemusic');
    expect(recognizeServiceSlug('OPENAI *CHATGPT SUBSCR')).toBe('chatgpt');
    expect(recognizeServiceSlug('Z.AI GLM CODING PLAN')).toBe('zdotai');
  });

  it('has patterns for every service of the shared list, once each', () => {
    const slugs = SERVICE_PATTERNS.map((service) => service.slug);
    expect([...slugs].sort()).toEqual(SUBSCRIPTION_SERVICES.map((service) => service.slug).sort());
  });

  it('gives null when no text names a service', () => {
    expect(recognizeServiceSlug('PLANO CELULAR', null, undefined, '')).toBeNull();
    expect(recognizeServiceSlug()).toBeNull();
  });

  it('takes the first text that names a service', () => {
    expect(recognizeServiceSlug('Assinatura', 'SPOTIFY', 'NETFLIX')).toBe('spotify');
  });
});
