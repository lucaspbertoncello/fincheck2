import type { MockState } from '#mocks/state/mock-state.type.ts';

// A subscription is an expense recurrence paid on a credit card (BR-REC-017). Not a new object.
export function isSubscriptionRecurrence(recurrence: MockState.RecurrenceRecord): boolean {
  return recurrence.kind === 'expense' && recurrence.method === 'credit';
}
