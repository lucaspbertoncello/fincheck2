import { describe, expect, it } from 'vitest';

import { describeConnectError } from '#/features/accounts/connect-account/utils/describe-connect-error.util.ts';
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

  it('has a plain answer for anything else', () => {
    expect(describeConnectError(new Error('boom'))).toBe('Não deu certo. Tente de novo.');
  });
});
