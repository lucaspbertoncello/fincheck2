import { SERVICE_LOGO_ART } from '@fincheck/ui';
import { describe, expect, it } from 'vitest';

import { SERVICE_PATTERNS } from '#/domain/recurrences/service-logo/constants/service-patterns.constant.ts';
import { recognizeService } from '#/domain/recurrences/service-logo/rules/recognize-service.rule.ts';

// What the statement says, then the name and the logo it must give.
const CASES = [
  ['NETFLIX.COM', 'Netflix', 'netflix'],
  ['GOOGLE *YOUTUBEPREMIUM', 'YouTube Premium', 'youtube'],
  ['GOOGLE *YOUTUBE MUSIC', 'YouTube Music', 'youtubemusic'],
  ['HBO MAX BRASIL', 'Max', 'hbomax'],
  ['MAX', 'Max', 'hbomax'],
  ['DISNEYPLUS', 'Disney+', null],
  ['DISNEY+ ASSINATURA', 'Disney+', null],
  ['AMAZON PRIME VIDEO', 'Prime Video', null],
  ['PRIMEVIDEO*2X3', 'Prime Video', null],
  ['APPLE TV+', 'Apple TV+', 'appletv'],
  ['GLOBOPLAY', 'Globoplay', null],
  ['PARAMOUNT+', 'Paramount+', 'paramountplus'],
  ['CRUNCHYROLL', 'Crunchyroll', 'crunchyroll'],
  ['STAR+ MENSAL', 'Star+', null],
  ['SPOTIFY', 'Spotify', 'spotify'],
  ['Spotify AB', 'Spotify', 'spotify'],
  ['APPLE MUSIC', 'Apple Music', 'applemusic'],
  ['DEEZER BRASIL', 'Deezer', 'deezer'],
  ['AMAZON MUSIC UNLIMITED', 'Amazon Music', null],
  ['TIDAL', 'Tidal', 'tidal'],
  ['OPENAI *CHATGPT SUBSCR', 'ChatGPT', null],
  ['CHATGPT PLUS', 'ChatGPT', null],
  ['CLAUDE.AI SUBSCRIPTION', 'Claude', 'claude'],
  ['ANTHROPIC', 'Claude', 'claude'],
  ['GOOGLE *GEMINI ADVANCED', 'Gemini', 'googlegemini'],
  ['DEEPSEEK', 'DeepSeek', 'deepseek'],
  ['Z.AI GLM CODING PLAN', 'GLM', 'zdotai'],
  ['ZHIPU AI', 'GLM', 'zdotai'],
  ['PERPLEXITY AI', 'Perplexity', 'perplexity'],
  ['GROK SUPER', 'Grok', null],
  ['XAI CORP', 'Grok', null],
  ['MISTRAL AI', 'Mistral', 'mistralai'],
  ['GITHUB COPILOT', 'GitHub Copilot', 'githubcopilot'],
  ['MIDJOURNEY INC', 'Midjourney', null],
] as const;

describe('recognizeService', () => {
  it.each(CASES)('reads "%s" as %s', (text, name, slug) => {
    expect(recognizeService(text)).toEqual({ name, slug });
  });

  it('has a case for each of the 26 services', () => {
    expect(new Set(CASES.map(([, name]) => name)).size).toBe(26);
    expect(SERVICE_PATTERNS).toHaveLength(26);
  });

  it('gives 18 services a logo file and 8 only the initial', () => {
    expect(SERVICE_PATTERNS.filter((service) => service.slug !== null)).toHaveLength(18);
    expect(SERVICE_PATTERNS.filter((service) => service.slug === null)).toHaveLength(8);
  });

  it('points every slug to a logo that exists', () => {
    for (const service of SERVICE_PATTERNS) {
      if (service.slug) expect(SERVICE_LOGO_ART).toHaveProperty(service.slug);
    }
  });

  it('ignores case and accents', () => {
    expect(recognizeService('netflix.com')?.name).toBe('Netflix');
    expect(recognizeService('Crunchyroll Prêmio')?.name).toBe('Crunchyroll');
  });

  it('does not recognize what is not one of the services', () => {
    for (const text of [
      'MERCADO DO ZE',
      'MAX ATACADISTA',
      'MAXIMUS ACADEMIA',
      'STAR BURGER',
      'APPLE.COM/BILL',
      'PLANO CELULAR',
      'MUSICANDO PREMIUM',
      'Salário Alvorada',
      '',
    ]) {
      expect(recognizeService(text)).toBeNull();
    }
  });

  it('tries the next text when the first one names no service', () => {
    expect(recognizeService('Assinatura de música', 'SPOTIFY')?.name).toBe('Spotify');
    expect(recognizeService(null, undefined, 'NETFLIX')?.name).toBe('Netflix');
    expect(recognizeService('Internet', null)).toBeNull();
  });
});
