import { ConflictError } from '#/shared/errors/conflict.error.ts';

// Another tag, active or archived, already has this name (compared with no difference for case or
// accent).
export class TagNameTakenError extends ConflictError {
  readonly code = 'TAG_NAME_TAKEN';

  constructor() {
    super('Já existe uma tag com esse nome.');
  }
}
