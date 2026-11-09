import { describe, expect, it } from 'vitest';

import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';
import { translatePluggyError } from '#/modules/sync/infra/pluggy/translate-pluggy-error.util.ts';

describe('translatePluggyError', () => {
  it.each([
    [400, 'authentication', 'credentials_invalid'],
    [401, 'authentication', 'credentials_invalid'],
    [403, 'authentication', 'credentials_invalid'],
    [404, 'authentication', 'credentials_invalid'],
    [429, 'authentication', 'unavailable'],
    [500, 'authentication', 'unavailable'],
    [503, 'authentication', 'unavailable'],
    [null, 'authentication', 'unavailable'],
    [404, 'item', 'item_not_found'],
    [401, 'item', 'unavailable'],
    [500, 'item', 'unavailable'],
    [429, 'item', 'unavailable'],
    [404, 'other', 'unavailable'],
    [400, 'other', 'unavailable'],
    [502, 'other', 'unavailable'],
    [null, 'other', 'unavailable'],
    [null, 'item', 'unavailable'],
  ] as const)('status %s on %s is %s', (status, context, kind) => {
    const error = translatePluggyError(status, context);

    expect(error).toBeInstanceOf(BankProviderError);
    expect(error.kind).toBe(kind);
  });
});
