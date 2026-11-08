import { DomainError } from '#/shared/errors/domain.error.ts';

// The transaction settles an occurrence of a recurrence and counts there as an income or an
// expense: its nature cannot change while the link stands (undo the link first).
export class TransactionLinkedToOccurrenceError extends DomainError {
  readonly code = 'TRANSACTION_LINKED_TO_OCCURRENCE';

  constructor() {
    super('A transação está ligada a uma recorrência: desligue antes de mudar a natureza.');
  }
}
