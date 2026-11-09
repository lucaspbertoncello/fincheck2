import { describe, expect, it } from 'vitest';

import { describeEditError } from '#/features/transactions/transaction-list/utils/describe-edit-error.util.ts';
import { ApiError } from '#/shared/api/api.error.ts';

describe('describeEditError', () => {
  it('explains a transaction linked to a bill and one linked to an occurrence', () => {
    expect(describeEditError(new ApiError(422, 'TRANSACTION_LINKED_TO_BILL', 'x')).message).toMatch(
      /ligada a uma conta/,
    );
    expect(
      describeEditError(new ApiError(422, 'TRANSACTION_LINKED_TO_OCCURRENCE', 'x')).message,
    ).toMatch(/ligada a uma recorrência/);
  });

  it('leaves the other codes to the common description of the transaction errors', () => {
    expect(describeEditError(new ApiError(422, 'TRANSACTION_IS_SPLIT', 'x')).message).toMatch(
      /dividida/,
    );
    expect(describeEditError(new Error('boom')).message).toBe('Não deu certo. Tente de novo.');
  });
});
