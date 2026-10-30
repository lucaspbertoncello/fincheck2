import type { ZodError } from 'zod';

/**
 * The first issue of each field of a failed schema, with a message of ours (the schema's own text
 * is English and meant for the API). `messages` is keyed by the first segment of the issue path.
 */
export function collectFieldErrors(
  error: ZodError,
  messages: Readonly<Record<string, string>>,
  fallback = 'Confira este campo',
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && errors[field] === undefined) errors[field] = messages[field] ?? fallback;
  }
  return errors;
}
