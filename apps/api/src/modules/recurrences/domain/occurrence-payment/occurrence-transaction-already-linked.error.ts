import { ConflictError } from '#/shared/errors/conflict.error.ts';

// A transaction settles one occurrence only (unique on the link).
export class OccurrenceTransactionAlreadyLinkedError extends ConflictError {
  readonly code = 'OCCURRENCE_TRANSACTION_ALREADY_LINKED';

  constructor() {
    super('A transação já abate uma ocorrência.');
  }
}
