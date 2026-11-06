import { DomainError } from '#/shared/errors/domain.error.ts';

// The target balance equals the current one: there is nothing to adjust.
export class AccountBalanceUnchangedError extends DomainError {
  readonly code = 'ACCOUNT_BALANCE_UNCHANGED';

  constructor() {
    super('O saldo já é esse.');
  }
}
