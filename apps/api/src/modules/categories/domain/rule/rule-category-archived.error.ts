import { DomainError } from '#/shared/errors/domain.error.ts';

// A rule cannot point to an archived category, nor be applied to the history with one (N10).
export class RuleCategoryArchivedError extends DomainError {
  readonly code = 'RULE_CATEGORY_ARCHIVED';

  constructor() {
    super('A categoria da regra está arquivada.');
  }
}
