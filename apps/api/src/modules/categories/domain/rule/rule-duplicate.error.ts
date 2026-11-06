import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Another rule, on or off, has the very same condition.
export class RuleDuplicateError extends ConflictError {
  readonly code = 'RULE_DUPLICATE';

  constructor() {
    super('Já existe uma regra com essa condição.');
  }
}
