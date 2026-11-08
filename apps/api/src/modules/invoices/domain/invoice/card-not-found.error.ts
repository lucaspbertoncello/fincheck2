import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The id matches no account, or the account is not a credit card.
export class CardNotFoundError extends NotFoundError {
  readonly code = 'CARD_NOT_FOUND';

  constructor() {
    super('O cartão não existe.');
  }
}
