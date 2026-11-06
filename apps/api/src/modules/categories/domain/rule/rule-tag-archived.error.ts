import { DomainError } from '#/shared/errors/domain.error.ts';

// A rule cannot take an archived tag.
export class RuleTagArchivedError extends DomainError {
  readonly code = 'RULE_TAG_ARCHIVED';

  constructor() {
    super('Uma das tags da regra está arquivada.');
  }
}
