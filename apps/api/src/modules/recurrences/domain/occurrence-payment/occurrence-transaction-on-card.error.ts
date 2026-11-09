import { DomainError } from '#/shared/errors/domain.error.ts';

// A credit on the card (a refund) never settles an occurrence, of income or of expense: the money
// did not come into an account, it only lowered the invoice.
export class OccurrenceTransactionOnCardError extends DomainError {
  readonly code = 'OCCURRENCE_TRANSACTION_ON_CARD';

  constructor() {
    super('Um crédito no cartão só abate a fatura: não quita uma recorrência.');
  }
}
