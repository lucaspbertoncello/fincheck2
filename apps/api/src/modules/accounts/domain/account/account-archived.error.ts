import { DomainError } from '#/shared/errors/domain.error.ts';

// The action is refused on an archived account.
export class AccountArchivedError extends DomainError {
  readonly code = 'ACCOUNT_ARCHIVED';

  constructor() {
    super('A conta está arquivada.');
  }
}
