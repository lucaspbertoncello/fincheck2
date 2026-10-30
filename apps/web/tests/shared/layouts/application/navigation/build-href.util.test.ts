import { describe, expect, it } from 'vitest';

import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';

describe('buildHref', () => {
  it('appends the month to a plain path', () => {
    expect(buildHref('/transactions', '2026-10')).toBe('/transactions?month=2026-10');
  });

  it('appends the month to a path that already has a query', () => {
    expect(buildHref('/transactions?new=transaction', '2026-10')).toBe(
      '/transactions?new=transaction&month=2026-10',
    );
  });

  it('leaves the path alone without a month', () => {
    expect(buildHref('/accounts?new=account', undefined)).toBe('/accounts?new=account');
  });
});
