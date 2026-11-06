import { DomainError } from '#/shared/errors/domain.error.ts';

export class TransactionSplitLinkedToBillError extends DomainError {
  readonly code = 'TRANSACTION_SPLIT_LINKED_TO_BILL';

  constructor() {
    super('Uma parte da divisão está ligada a uma dívida.');
  }
}
