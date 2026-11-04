import { describe, expect, it } from 'vitest';

import {
  connectErrorNeedsSettings,
  describeConnectError,
} from '#/features/accounts/connect-account/utils/describe-connect-error.util.ts';
import { ApiError } from '#/shared/api/api.error.ts';

describe('describeConnectError', () => {
  it('translates the codes of the contract', () => {
    expect(describeConnectError(new ApiError(422, 'SYNC_ITEM_NOT_FOUND', 'x'))).toMatch(
      /não achou/,
    );
    expect(describeConnectError(new ApiError(409, 'SYNC_CONNECTION_ALREADY_EXISTS', 'x'))).toMatch(
      /já está conectado/,
    );
  });

  it('never names the aggregator in what the person reads', () => {
    for (const code of [
      'SYNC_NOT_CONFIGURED',
      'SYNC_ITEM_NOT_FOUND',
      'SYNC_CREDENTIALS_INVALID',
      'SYNC_PROVIDER_UNAVAILABLE',
    ]) {
      expect(describeConnectError(new ApiError(422, code, 'x'))).not.toMatch(/pluggy/i);
    }
  });

  it('sends the keys problems to Configurações and the rest to a new try', () => {
    expect(connectErrorNeedsSettings(new ApiError(422, 'SYNC_NOT_CONFIGURED', 'x'))).toBe(true);
    expect(connectErrorNeedsSettings(new ApiError(422, 'SYNC_CREDENTIALS_INVALID', 'x'))).toBe(
      true,
    );
    expect(connectErrorNeedsSettings(new ApiError(422, 'SYNC_ITEM_NOT_FOUND', 'x'))).toBe(false);
    expect(connectErrorNeedsSettings(new Error('boom'))).toBe(false);
  });

  it('has a plain answer for anything else', () => {
    expect(describeConnectError(new Error('boom'))).toBe('Não deu certo. Tente de novo.');
  });
});
