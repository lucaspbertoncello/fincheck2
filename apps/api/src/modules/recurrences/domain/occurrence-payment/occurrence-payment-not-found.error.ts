import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The link does not exist, or it belongs to another occurrence.
export class OccurrencePaymentNotFoundError extends NotFoundError {
  readonly code = 'OCCURRENCE_PAYMENT_NOT_FOUND';

  constructor() {
    super('O vínculo não existe nesta ocorrência.');
  }
}
