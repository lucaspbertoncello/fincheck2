import { updateRecurrenceRequestSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type {
  BuildBodyResult,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';
import { buildDateRule } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-date-rule.util.ts';
import { mapFormIssues } from '#/features/recurrences/recurrence-list/recurrence-form/utils/map-form-issues.util.ts';

const RULE_FIELDS = ['type', 'day', 'businessDayNumber', 'toleranceDays'] as const;

/**
 * Builds the body of `PATCH /recurrences/:id` with only what changed: the API recopies a field
 * into the open months only when it came in this request, so a value edited by hand in another
 * month stays. Returns "unchanged" when nothing differs from the saved recurrence.
 */
export function buildUpdateBody(
  values: RecurrenceFormValues,
  saved: Recurrence.Dto,
): BuildBodyResult<Recurrence.UpdateRequest> {
  const draft: Record<string, unknown> = {};
  const name = values.name.trim();
  const counterparty = values.counterparty.trim();
  const matchText = values.matchText.trim();
  const maxPayments = values.maxPayments.trim();
  const rule = buildDateRule(values);

  if (name !== saved.name) draft['name'] = values.name;
  if (values.amountCents !== saved.expectedAmountCents) {
    draft['expectedAmountCents'] = values.amountCents;
  }
  if (counterparty !== (saved.counterparty ?? '')) {
    draft['counterparty'] = counterparty === '' ? null : counterparty;
  }
  if (matchText !== (saved.matchText ?? ''))
    draft['matchText'] = matchText === '' ? null : matchText;
  if (values.categoryId !== saved.categoryId) draft['categoryId'] = values.categoryId;
  if (values.accountId !== saved.accountId) draft['accountId'] = values.accountId;
  const regime = values.kind === 'income' ? values.employmentRegime : '';
  if (regime !== (saved.employmentRegime ?? '')) {
    draft['employmentRegime'] = regime === '' ? null : regime;
  }
  if (RULE_FIELDS.some((field) => rule[field] !== saved.dateRule[field])) draft['dateRule'] = rule;
  if (maxPayments !== String(saved.maxPayments)) {
    draft['maxPayments'] = maxPayments === '' ? undefined : Number(maxPayments);
  }

  if (Object.keys(draft).length === 0) return { status: 'unchanged' };

  const parsed = updateRecurrenceRequestSchema.safeParse({ ...draft, applyFrom: values.applyFrom });

  return parsed.success
    ? { status: 'ok', body: parsed.data }
    : { status: 'invalid', errors: mapFormIssues(parsed.error.issues) };
}
