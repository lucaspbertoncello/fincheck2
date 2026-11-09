import { DomainError } from '#/shared/errors/domain.error.ts';

// The Pluggy has no such item.
export class SyncItemNotFoundError extends DomainError {
  readonly code = 'SYNC_ITEM_NOT_FOUND';

  constructor() {
    super('O Pluggy não achou esse item.');
  }
}
