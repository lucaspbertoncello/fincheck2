import { DomainError } from '#/shared/errors/domain.error.ts';

export class BillAlreadySettledError extends DomainError {
  readonly code = 'BILL_ALREADY_SETTLED';

  constructor() {
    super('A conta já está quitada.');
  }
}
