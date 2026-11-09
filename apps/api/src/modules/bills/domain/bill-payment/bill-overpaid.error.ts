import { DomainError } from '#/shared/errors/domain.error.ts';

export class BillOverpaidError extends DomainError {
  readonly code = 'BILL_OVERPAID';

  constructor() {
    super('O valor passa do que falta pagar.');
  }
}
