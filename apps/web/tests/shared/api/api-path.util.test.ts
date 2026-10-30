import { describe, expect, it } from 'vitest';

import { apiPath } from '#/shared/api/api-path.util.ts';

describe('apiPath', () => {
  it('fills the params and encodes each value', () => {
    const id = 'a/b?c';

    expect(apiPath`/bills/${id}/payments/${'42'}`).toBe('/bills/a%2Fb%3Fc/payments/42');
    expect(apiPath`/health`).toBe('/health');
  });
});
