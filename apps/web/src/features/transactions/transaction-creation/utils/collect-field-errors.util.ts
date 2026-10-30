import type { z } from 'zod';

/**
 * Turns the issues of a Zod parse into one message per form field, keeping the first of each, so
 * the form shows the same rule the request schema enforces. `fieldOf` maps the schema key to the field.
 */
export function collectFieldErrors<Field extends string>(
  issues: readonly z.core.$ZodIssue[],
  fieldOf: Record<string, Field>,
  messageOf: (field: Field) => string,
): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const issue of issues) {
    const field = fieldOf[String(issue.path[0])];
    if (field && !errors[field]) errors[field] = messageOf(field);
  }
  return errors;
}
