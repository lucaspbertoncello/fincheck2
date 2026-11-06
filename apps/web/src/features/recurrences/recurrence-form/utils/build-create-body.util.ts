import { createRecurrenceRequestSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type {
  BuildBodyResult,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';
import { buildDateRule } from '#/features/recurrences/recurrence-form/utils/build-date-rule.util.ts';
import { resolveServiceSlugBody } from '#/features/recurrences/recurrence-form/utils/resolve-service-slug-body.util.ts';
import { mapFormIssues } from '#/features/recurrences/recurrence-form/utils/map-form-issues.util.ts';

/** Validates the form with the request schema of `POST /recurrences` and builds the body. */
export function buildCreateBody(
  values: RecurrenceFormValues,
  /** `credit` when the chosen account is a credit card (`resolveRecurrenceMethod`). */
  method?: 'credit',
): BuildBodyResult<Recurrence.CreateRequest> {
  const counterparty = values.counterparty.trim();
  const matchText = values.matchText.trim();
  const maxPayments = values.maxPayments.trim();
  const isSubscription = values.kind === 'expense' && values.isSubscription;

  const parsed = createRecurrenceRequestSchema.safeParse({
    kind: values.kind,
    name: values.name,
    expectedAmountCents: values.amountCents,
    counterparty: counterparty === '' ? undefined : counterparty,
    matchText: matchText === '' ? undefined : matchText,
    employmentRegime:
      values.kind === 'income' && values.employmentRegime !== ''
        ? values.employmentRegime
        : undefined,
    categoryId: values.categoryId ?? undefined,
    accountId: values.accountId ?? undefined,
    method,
    dateRule: buildDateRule(values),
    maxPayments: maxPayments === '' ? undefined : Number(maxPayments),
    isSubscription,
    serviceSlug: isSubscription ? resolveServiceSlugBody(values.serviceSlug) : undefined,
  });

  return parsed.success
    ? { status: 'ok', body: parsed.data }
    : { status: 'invalid', errors: mapFormIssues(parsed.error.issues) };
}
