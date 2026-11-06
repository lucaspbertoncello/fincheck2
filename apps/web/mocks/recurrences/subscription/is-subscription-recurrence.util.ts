import type { MockState } from '#mocks/state/mock-state.type.ts';

// A subscription is an expense recurrence marked "É assinatura", paid by any method (BR-REC-017).
// Not a new object. Only an expense can carry the flag.
export function isSubscriptionRecurrence(recurrence: MockState.RecurrenceRecord): boolean {
  return recurrence.kind === 'expense' && recurrence.isSubscription;
}
