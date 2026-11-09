import { DomainError } from '#/shared/errors/domain.error.ts';

export class BillOriginTransactionInvalidError extends DomainError {
  readonly code = 'BILL_ORIGIN_TRANSACTION_INVALID';

  constructor() {
    super('A origem precisa ser uma saída de despesa, inteira e que conta.');
  }
}
