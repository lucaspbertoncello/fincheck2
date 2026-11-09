import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

interface PresentOptions {
  carriedOver?: boolean;
}

// The contract's Occurrence.Dto. The state is never stored: it comes from the payments, the dates
// and the marks (recurrences.md, "Valor recebido, estado e diferença").
export function presentOccurrence(
  database: MockState.Database,
  record: MockState.OccurrenceRecord,
  options: PresentOptions = {},
): Occurrence.Dto {
  const recurrence = database.recurrences.find((item) => item.id === record.recurrenceId);
  if (!recurrence) throw new Error(`Occurrence ${record.id} without recurrence`);

  // Each link is worth what the transaction is worth now, and only while the transaction counts.
  const payments: Occurrence.Payment[] = [];
  for (const payment of record.payments) {
    const tx = database.transactions.find((item) => item.id === payment.transactionId);
    if (!tx || !countsInAccounts(tx)) continue;
    payments.push({
      ...payment,
      amountCents: Math.min(payment.amountCents, Math.abs(tx.amountCents)),
      occurredOn: tx.occurredOn,
      description: tx.description,
    });
  }
  payments.sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));

  const expected = record.expectedAmountCents;
  const received = payments.reduce((sum, payment) => sum + payment.amountCents, 0);

  let status: Occurrence.Status;
  if (record.skippedAt) status = 'skipped';
  else if (
    record.settledAt ||
    received >= expected ||
    (payments.length === 1 && received >= expected * 0.85)
  )
    status = 'confirmed';
  else if (TODAY > record.windowEndOn) status = 'late';
  else if (received > 0) status = 'partial';
  else status = 'expected';

  const hasDifference = status === 'confirmed' && !record.settledAt && received !== expected;
  const difference: Occurrence.Difference | null = hasDifference
    ? {
        amountCents: received - expected,
        decision: recurrence.amountMode === 'last_received' ? 'updated' : record.decision,
      }
    : null;

  return {
    id: record.id,
    recurrenceId: record.recurrenceId,
    recurrenceName: recurrence.name,
    kind: recurrence.kind,
    month: record.month,
    expectedOn: record.expectedOn,
    windowStartOn: record.windowStartOn,
    windowEndOn: record.windowEndOn,
    expectedAmountCents: expected,
    receivedCents: received,
    remainingCents:
      status === 'confirmed' || status === 'skipped' ? 0 : Math.max(0, expected - received),
    status,
    settledAt: record.settledAt,
    skippedAt: record.skippedAt,
    difference,
    needsAttention: status === 'late' || (difference !== null && difference.decision === null),
    carriedOver: options.carriedOver ?? false,
    payments,
    accountId: recurrence.accountId,
    method: recurrence.method,
  };
}
