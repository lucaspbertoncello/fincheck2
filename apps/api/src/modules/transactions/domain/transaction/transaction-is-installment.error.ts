import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionIsInstallmentError extends DomainError {
  readonly code = 'TRANSACTION_IS_INSTALLMENT';

  constructor() {
    super('É uma parcela: exclua o plano de parcelas.');
  }
}
