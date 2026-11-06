import { NotFoundError } from '#/shared/errors/not-found.error.ts';

// The id matches no rule.
export class RuleNotFoundError extends NotFoundError {
  readonly code = 'RULE_NOT_FOUND';

  constructor() {
    super('A regra não existe.');
  }
}
