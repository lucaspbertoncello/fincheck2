import type { ZodError } from 'zod';

type CollectFieldErrorsOptions<Field extends string> = {
  /** Maps the first segment of an issue path (the schema key) to the form field. Default: the key itself. */
  fieldOf?: Readonly<Record<string, Field>>;
  /** Message of a field that has none in `messages`. */
  fallback?: string;
};

/**
 * The first issue of each field of a failed schema, with a message of ours (the schema's own text
 * is English and meant for the API). `messages` is keyed by form field.
 */
export function collectFieldErrors<Field extends string = string>(
  error: ZodError,
  messages: Readonly<Partial<Record<Field, string>>>,
  { fieldOf, fallback = 'Confira este campo' }: CollectFieldErrorsOptions<Field> = {},
): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    const field = fieldOf ? fieldOf[key] : (key as Field);
    if (field && errors[field] === undefined) errors[field] = messages[field] ?? fallback;
  }
  return errors;
}
