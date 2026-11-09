import { DomainError } from '#/shared/errors/domain.error.ts';

// A rule only adds tags of the category it puts: a tag of another category, or any tag on a rule
// with no category, is refused.
export class RuleTagCategoryMismatchError extends DomainError {
  readonly code = 'RULE_TAG_CATEGORY_MISMATCH';

  constructor() {
    super('A regra só pode usar tags da categoria que ela aplica.');
  }
}
