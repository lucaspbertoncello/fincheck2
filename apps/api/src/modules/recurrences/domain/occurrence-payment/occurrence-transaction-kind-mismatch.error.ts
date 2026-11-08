import { DomainError } from '#/shared/errors/domain.error.ts';

// An income takes a credit of nature income, an expense a debit of nature expense, and an ignored one takes neither.
export class OccurrenceTransactionKindMismatchError extends DomainError {
  readonly code = 'OCCURRENCE_TRANSACTION_KIND_MISMATCH';

  constructor() {
    super('A transação não bate com o tipo da recorrência.');
  }
}
