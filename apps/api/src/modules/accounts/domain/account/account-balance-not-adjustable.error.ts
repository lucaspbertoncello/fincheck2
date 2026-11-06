import { DomainError } from '#/shared/errors/domain.error.ts';

// Only the balance of a manual account or wallet is adjusted (BR-ACC-006).
export class AccountBalanceNotAdjustableError extends DomainError {
  readonly code = 'ACCOUNT_BALANCE_NOT_ADJUSTABLE';

  constructor() {
    super('Só o saldo de conta manual ou carteira pode ser ajustado.');
  }
}
