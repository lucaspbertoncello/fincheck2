import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';

// The `Recurrence.Dto` of the contract. The five fields of the date rule always come, `null` in the
// ones the rule does not use.
export function toRecurrenceDto(recurrence: Recurrence): RecurrenceContract.Dto {
  return {
    id: recurrence.id,
    kind: recurrence.kind,
    name: recurrence.name,
    expectedAmountCents: recurrence.expectedAmount.cents,
    amountMode: recurrence.amountMode,
    counterparty: recurrence.counterparty,
    matchText: recurrence.matchText,
    employmentRegime: recurrence.employmentRegime,
    accountId: recurrence.accountId,
    method: recurrence.method,
    categoryId: recurrence.categoryId,
    isSubscription: recurrence.isSubscription,
    serviceSlug: recurrence.serviceSlug,
    dateRule: recurrence.dateRule.toDto(),
    maxPayments: recurrence.maxPayments,
    startsMonth: recurrence.startsMonth.value,
    pausedAt: recurrence.pausedAt,
    archivedAt: recurrence.archivedAt,
    createdAt: recurrence.createdAt,
    updatedAt: recurrence.updatedAt,
  };
}
