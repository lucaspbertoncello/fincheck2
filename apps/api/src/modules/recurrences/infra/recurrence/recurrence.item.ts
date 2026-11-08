import { subscriptionServiceSlugSchema } from '@fincheck/shared/recurrences/subscription-service/subscription-service.schema.ts';
import type { Insertable, Selectable } from 'kysely';

import type { RecurrencesTable } from '#/database/tables/recurrences/recurrences-table.type.ts';
import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The aggregate as a row of `recurrences`.
export class RecurrenceItem {
  static fromEntity(recurrence: Recurrence): Insertable<RecurrencesTable> {
    return {
      id: recurrence.id,
      kind: recurrence.kind,
      name: recurrence.name,
      expected_amount_cents: recurrence.expectedAmount.cents,
      amount_mode: recurrence.amountMode,
      counterparty: recurrence.counterparty,
      match_text: recurrence.matchText,
      account_id: recurrence.accountId,
      method: recurrence.method,
      category_id: recurrence.categoryId,
      date_rule: recurrence.dateRule.type,
      day: recurrence.dateRule.day,
      business_day_number: recurrence.dateRule.businessDayNumber,
      tolerance_days: recurrence.dateRule.toleranceDays,
      non_business_day_shift: recurrence.dateRule.nonBusinessDayShift,
      employment_regime: recurrence.employmentRegime,
      is_subscription: recurrence.isSubscription ? 1 : 0,
      service_slug: recurrence.serviceSlug,
      max_payments: recurrence.maxPayments,
      starts_month: recurrence.startsMonth.value,
      paused_at: recurrence.pausedAt,
      archived_at: recurrence.archivedAt,
      created_at: recurrence.createdAt,
      updated_at: recurrence.updatedAt,
    };
  }

  static toDomain(row: Selectable<RecurrencesTable>): Recurrence {
    // The list of services lives in `shared` and may lose one (Star+ was folded into Disney+): a
    // slug the list no longer knows reads as "Outro" instead of breaking the read.
    const slug = subscriptionServiceSlugSchema.safeParse(row.service_slug);

    return new Recurrence({
      id: row.id,
      kind: row.kind,
      name: row.name,
      expectedAmount: Money.fromCents(row.expected_amount_cents),
      amountMode: row.amount_mode,
      counterparty: row.counterparty,
      matchText: row.match_text,
      accountId: row.account_id,
      method: row.method,
      categoryId: row.category_id,
      isSubscription: row.is_subscription === 1,
      serviceSlug: slug.success ? slug.data : null,
      dateRule: DateRule.create({
        type: row.date_rule,
        day: row.day,
        businessDayNumber: row.business_day_number,
        toleranceDays: row.tolerance_days,
        nonBusinessDayShift: row.non_business_day_shift,
      }),
      employmentRegime: row.employment_regime,
      maxPayments: row.max_payments,
      startsMonth: Month.of(row.starts_month),
      pausedAt: row.paused_at,
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
