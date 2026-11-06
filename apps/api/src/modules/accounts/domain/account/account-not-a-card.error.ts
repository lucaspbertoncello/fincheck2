import { DomainError } from '#/shared/errors/domain.error.ts';

// Card data was sent for an account that is not a credit card.
export class AccountNotACardError extends DomainError {
  readonly code = 'ACCOUNT_NOT_A_CARD';

  constructor() {
    super('A conta não é um cartão de crédito.');
  }
}
