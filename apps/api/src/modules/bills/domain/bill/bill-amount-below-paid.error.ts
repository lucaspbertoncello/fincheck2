import { DomainError } from '#/shared/errors/domain.error.ts';

export class BillAmountBelowPaidError extends DomainError {
  readonly code = 'BILL_AMOUNT_BELOW_PAID';

  constructor() {
    super('O valor não pode ficar abaixo do que já foi pago.');
  }
}
