import { idSchema } from '@fincheck/shared/common/id/id.schema.ts';

import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';

// The `transactionIds` of `GET /rule-suggestions`: ids separated by commas. Each one has to be an id
// (the schema of the contract only counts them), or the filter would silently match nothing.
export function parseTransactionIds(text: string | undefined): Set<string> | null {
  if (text === undefined) return null;
  const ids = text.split(',').filter(Boolean);
  if (!ids.every((id) => idSchema.safeParse(id).success)) {
    throw new RequestValidationError([
      { path: 'transactionIds', message: 'Every item must be a valid id' },
    ]);
  }

  return new Set(ids);
}
