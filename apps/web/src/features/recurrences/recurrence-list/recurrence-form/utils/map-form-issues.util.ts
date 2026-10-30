import type { z } from 'zod';

import {
  FORM_ERROR_MESSAGES,
  ISSUE_PATH_TO_FIELD,
} from '#/features/recurrences/recurrence-list/recurrence-form/constants/form-error-messages.constant.ts';
import type { RecurrenceFormErrors } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

/** Turns the issues of the request schema into one message per form field. */
export function mapFormIssues(issues: readonly z.core.$ZodIssue[]): RecurrenceFormErrors {
  const errors: RecurrenceFormErrors = {};

  for (const issue of issues) {
    const field = ISSUE_PATH_TO_FIELD[issue.path.join('.')];
    if (field && !errors[field]) errors[field] = FORM_ERROR_MESSAGES[field];
  }

  return errors;
}
