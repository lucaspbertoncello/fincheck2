import { DomainError } from '#/shared/errors/domain.error.ts';

export class InstallmentAccountNotCardError extends DomainError {
  readonly code = 'INSTALLMENT_ACCOUNT_NOT_CARD';

  constructor() {
    super('A compra parcelada só existe em cartão de crédito.');
  }
}
