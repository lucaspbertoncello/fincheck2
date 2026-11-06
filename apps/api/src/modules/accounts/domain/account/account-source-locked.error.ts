import { DomainError } from '#/shared/errors/domain.error.ts';

// The bank of a Pluggy account comes from the bank and is not edited.
export class AccountSourceLockedError extends DomainError {
  readonly code = 'ACCOUNT_SOURCE_LOCKED';

  constructor() {
    super('O banco de uma conta do Pluggy não muda.');
  }
}
