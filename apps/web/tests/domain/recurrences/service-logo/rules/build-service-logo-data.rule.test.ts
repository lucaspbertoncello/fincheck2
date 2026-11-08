import { describe, expect, it } from 'vitest';

import { buildServiceLogoData } from '#/domain/recurrences/service-logo/rules/build-service-logo-data.rule.ts';

describe('buildServiceLogoData', () => {
  it('gives the name of the shared list and the logo of the design system', () => {
    expect(buildServiceLogoData('youtube')).toEqual({ name: 'YouTube Premium', slug: 'youtube' });
    expect(buildServiceLogoData('googlegemini')).toEqual({
      name: 'Gemini',
      slug: 'googlegemini',
    });
  });

  it('gives null to a service the design system has no logo for', () => {
    expect(buildServiceLogoData('disneyplus')).toBeNull();
    expect(buildServiceLogoData('primevideo')).toBeNull();
  });
});
