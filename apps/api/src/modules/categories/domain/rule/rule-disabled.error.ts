import { DomainError } from '#/shared/errors/domain.error.ts';

// A rule that is off is not applied to the history.
export class RuleDisabledError extends DomainError {
  readonly code = 'RULE_DISABLED';

  constructor() {
    super('A regra está desligada.');
  }
}
