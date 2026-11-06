import { updateRecurrenceRequestSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type {
  BuildBodyResult,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';
import { buildDateRule } from '#/features/recurrences/recurrence-form/utils/build-date-rule.util.ts';
import { resolveServiceSlugBody } from '#/features/recurrences/recurrence-form/utils/resolve-service-slug-body.util.ts';
import { mapFormIssues } from '#/features/recurrences/recurrence-form/utils/map-form-issues.util.ts';

const RULE_FIELDS = [
  'type',
  'day',
  'businessDayNumber',
  'toleranceDays',
  'nonBusinessDayShift',
] as const;

/**
 * Builds the body of `PATCH /recurrences/:id` with only what changed: the API recopies a field
 * into the open months only when it came in this request, so a value edited by hand in another
 * month stays. Returns "unchanged" when nothing differs from the saved recurrence.
 */
export function buildUpdateBody(
  values: RecurrenceFormValues,
  saved: Recurrence.Dto,
  /** `credit` when the chosen account is a credit card (`resolveRecurrenceMethod`). */
  method?: 'credit',
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
  if (values.accountId !== saved.accountId) {
    draft['accountId'] = values.accountId;
    // Moving onto a card makes it a card expense; moving off a card drops the `credit` method.
    if (method === 'credit') draft['method'] = 'credit';
    else if (saved.method === 'credit') draft['method'] = null;
  }
  const regime = values.kind === 'income' ? values.employmentRegime : '';
  if (regime !== (saved.employmentRegime ?? '')) {
    draft['employmentRegime'] = regime === '' ? null : regime;
  }
  if (RULE_FIELDS.some((field) => rule[field] !== saved.dateRule[field])) draft['dateRule'] = rule;
  if (maxPayments !== String(saved.maxPayments)) {
    draft['maxPayments'] = maxPayments === '' ? undefined : Number(maxPayments);
  }

  const isSubscription = values.kind === 'expense' && values.isSubscription;
  const serviceSlug = isSubscription ? resolveServiceSlugBody(values.serviceSlug) : null;
  if (isSubscription !== saved.isSubscription) {
    // Turning the flag off also clears the service.
    draft['isSubscription'] = isSubscription;
    draft['serviceSlug'] = serviceSlug;
  } else if (isSubscription && serviceSlug !== saved.serviceSlug) {
    draft['serviceSlug'] = serviceSlug;
  }

  if (Object.keys(draft).length === 0) return { status: 'unchanged' };

  const parsed = updateRecurrenceRequestSchema.safeParse({ ...draft, applyFrom: values.applyFrom });

  return parsed.success
    ? { status: 'ok', body: parsed.data }
    : { status: 'invalid', errors: mapFormIssues(parsed.error.issues) };
}
