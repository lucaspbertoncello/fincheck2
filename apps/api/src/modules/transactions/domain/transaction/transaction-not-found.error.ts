import { NotFoundError } from '#/shared/errors/not-found.error.ts';

export class TransactionNotFoundError extends NotFoundError {
  readonly code = 'TRANSACTION_NOT_FOUND';

  constructor() {
    super('A transação não existe.');
  }
}
