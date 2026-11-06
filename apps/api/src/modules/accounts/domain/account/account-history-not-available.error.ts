import { DomainError } from '#/shared/errors/domain.error.ts';

// The balance curve is for accounts with a balance, not cards nor Pluggy accounts without a bank balance yet.
export class AccountHistoryNotAvailableError extends DomainError {
  readonly code = 'ACCOUNT_HISTORY_NOT_AVAILABLE';

  constructor() {
    super('A curva de saldo não existe para esta conta.');
  }
}
