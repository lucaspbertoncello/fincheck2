import { describe, expect, it } from 'vitest';

import { resolveRecurrenceServiceLogo } from '#/domain/recurrences/service-logo/rules/resolve-recurrence-service-logo.rule.ts';

describe('resolveRecurrenceServiceLogo', () => {
  it('gives the logo of a subscription with a service that has a logo file', () => {
    expect(resolveRecurrenceServiceLogo({ isSubscription: true, serviceSlug: 'netflix' })).toEqual({
      name: 'Netflix',
      slug: 'netflix',
    });
  });

  it('gives null to "Outro" (no service)', () => {
    expect(resolveRecurrenceServiceLogo({ isSubscription: true, serviceSlug: null })).toBeNull();
  });

  it('gives null to a service with no logo file', () => {
    expect(
      resolveRecurrenceServiceLogo({ isSubscription: true, serviceSlug: 'disneyplus' }),
    ).toBeNull();
  });

  it('gives null when the recurrence is not a subscription, even with a service slug', () => {
    expect(
      resolveRecurrenceServiceLogo({ isSubscription: false, serviceSlug: 'netflix' }),
    ).toBeNull();
  });
});
