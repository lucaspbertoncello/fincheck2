import { DomainError } from '#/shared/errors/domain.error.ts';

// The account picked is not a candidate, or the Pluggy account is not waiting.
export class SyncAccountMatchInvalidError extends DomainError {
  readonly code = 'SYNC_ACCOUNT_MATCH_INVALID';

  constructor() {
    super('A conta escolhida não serve para esse par.');
  }
}
