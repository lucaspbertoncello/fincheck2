import type { Insertable, Selectable } from 'kysely';

import type { OccurrencePaymentsTable } from '#/database/tables/recurrences/occurrence-payments-table.type.ts';
import type { RecurrenceOccurrencesTable } from '#/database/tables/recurrences/recurrence-occurrences-table.type.ts';
import { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import { OccurrencePayment } from '#/modules/recurrences/domain/occurrence-payment/occurrence-payment.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The aggregate as rows: the occurrence and its payments.
export class OccurrenceItem {
  static fromEntity(occurrence: Occurrence): OccurrenceItem.Rows {
    return {
      occurrence: {
        id: occurrence.id,
        recurrence_id: occurrence.recurrenceId,
        month: occurrence.month.value,
        expected_on: occurrence.expectedOn?.value ?? null,
        window_start_on: occurrence.windowStartOn.value,
        window_end_on: occurrence.windowEndOn.value,
        expected_amount_cents: occurrence.expectedAmount.cents,
        settled_at: occurrence.settledAt,
        skipped_at: occurrence.skippedAt,
        difference_decision: occurrence.differenceDecision,
        created_at: occurrence.createdAt,
        updated_at: occurrence.updatedAt,
      },
      payments: occurrence.payments.map((payment) => ({
        id: payment.id,
        occurrence_id: occurrence.id,
        transaction_id: payment.transactionId,
        amount_cents: payment.amount.cents,
        linked_by: payment.linkedBy,
        created_at: payment.createdAt,
      })),
    };
  }

  static toDomain(
    row: Selectable<RecurrenceOccurrencesTable>,
    payments: Selectable<OccurrencePaymentsTable>[],
  ): Occurrence {
    return new Occurrence({
      id: row.id,
      recurrenceId: row.recurrence_id,
      month: Month.of(row.month),
      expectedOn: row.expected_on === null ? null : BusinessDate.of(row.expected_on),
      windowStartOn: BusinessDate.of(row.window_start_on),
      windowEndOn: BusinessDate.of(row.window_end_on),
      expectedAmount: Money.fromCents(row.expected_amount_cents),
      settledAt: row.settled_at,
      skippedAt: row.skipped_at,
      differenceDecision: row.difference_decision,
      payments: payments.map(
        (payment) =>
          new OccurrencePayment({
            id: payment.id,
            transactionId: payment.transaction_id,
            amount: Money.fromCents(payment.amount_cents),
            linkedBy: payment.linked_by,
            createdAt: payment.created_at,
          }),
      ),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

export namespace OccurrenceItem {
  export type Rows = {
    occurrence: Insertable<RecurrenceOccurrencesTable>;
    payments: Insertable<OccurrencePaymentsTable>[];
  };
}
