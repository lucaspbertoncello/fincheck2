import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Another category of the same kind, active or archived, already has this name (compared with no
// difference for case or accent).
export class CategoryNameTakenError extends ConflictError {
  readonly code = 'CATEGORY_NAME_TAKEN';

  constructor() {
    super('Já existe uma categoria com esse nome.');
  }
}
