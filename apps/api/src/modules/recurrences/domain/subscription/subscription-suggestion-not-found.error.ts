import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The key no longer yields a suggestion (BR-REC-017).
export class SubscriptionSuggestionNotFoundError extends NotFoundError {
  readonly code = 'SUBSCRIPTION_SUGGESTION_NOT_FOUND';

  constructor() {
    super('Essa sugestão não existe mais.');
  }
}
