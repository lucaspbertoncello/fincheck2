import { DomainError } from '#/shared/errors/domain.error.ts';

// A rule has to do something: set a category, add a tag, or both.
export class RuleActionRequiredError extends DomainError {
  readonly code = 'RULE_ACTION_REQUIRED';

  constructor() {
    super('A regra precisa de uma categoria ou de pelo menos uma tag.');
  }
}
