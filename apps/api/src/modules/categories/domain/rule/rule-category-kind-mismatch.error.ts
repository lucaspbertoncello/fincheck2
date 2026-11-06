import { DomainError } from '#/shared/errors/domain.error.ts';

// The condition `kind` of the rule and the kind of its category disagree.
export class RuleCategoryKindMismatchError extends DomainError {
  readonly code = 'RULE_CATEGORY_KIND_MISMATCH';

  constructor() {
    super('O tipo da regra é diferente do tipo da categoria.');
  }
}
