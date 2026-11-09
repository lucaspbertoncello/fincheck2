import { DomainError } from '#/shared/errors/domain.error.ts';

export class BillOriginAmountExceedsError extends DomainError {
  readonly code = 'BILL_ORIGIN_AMOUNT_EXCEEDS';

  constructor() {
    super('A parte do amigo passa do valor da transação ou da conta.');
  }
}
