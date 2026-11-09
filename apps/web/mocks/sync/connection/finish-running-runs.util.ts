import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { readItemOutcome } from '#mocks/sync/connection/read-item-outcome.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// What the first round of a new item brings: the account (born here, from what the bank says of it)
// and a few transactions, among them a transfer between own accounts and the payment of a card
// invoice, which the import marks by itself (`natureSetBy: system`).
function importNewItem(
  database: MockState.Database,
  connection: MockState.ConnectionRecord,
): MockState.TransactionRecord[] {
  const account: MockState.AccountRecord = {
    id: newId(),
    type: 'checking',
    source: 'pluggy',
    name: connection.institutionName,
    institutionCode: connection.institutionCode,
    institutionName: null,
    bankBalanceCents: 87_420,
    balanceAt: NOW_ISO,
    connectionId: connection.id,
    creditCard: null,
    archivedAt: null,
    createdAt: NOW_ISO,
  };
  database.accounts.push(account);
  connection.accountIds.push(account.id);

  const brought = [
    makeTransactionRecord({
      accountId: account.id,
      method: 'pix',
      description: 'PIX RECEBIDO SALARIO',
      amountCents: 300_000,
      occurredOn: addDays(TODAY, -40),
    }),
    makeTransactionRecord({
      accountId: account.id,
      method: 'transfer',
      nature: 'transfer',
      natureSetBy: 'system',
      description: 'TRANSFERENCIA ENTRE CONTAS',
      amountCents: -50_000,
      occurredOn: addDays(TODAY, -12),
    }),
    makeTransactionRecord({
      accountId: account.id,
      method: 'other',
      nature: 'invoice_payment',
      natureSetBy: 'system',
      description: 'PAGAMENTO FATURA CARTAO',
      amountCents: -80_000,
      occurredOn: addDays(TODAY, -5),
    }),
  ];
  database.transactions.push(...brought);

  return brought;
}

// A reconnected item: each account takes from the bank its balance (what it showed when the bank
// was disconnected, which the adjustment made equal to the sum of its transactions).
function refreshBalances(
  database: MockState.Database,
  connection: MockState.ConnectionRecord,
): void {
  for (const accountId of connection.accountIds) {
    const account = database.accounts.find((item) => item.id === accountId);
    if (!account || account.bankBalanceCents !== null) continue;
    account.bankBalanceCents =
      account.type === 'credit_card'
        ? 0
        : database.transactions
            .filter((tx) => tx.accountId === account.id && countsInAccounts(tx))
            .reduce((sum, tx) => sum + tx.amountCents, 0);
    account.balanceAt = NOW_ISO;
  }
}

// A run in the mock lasts until the next read; then it ends the way the item says (see
// `readItemOutcome`): well, in error (the connection moves to `error` with the code), quietly with
// nothing new (the bank is still being read) or in `PROVIDER_ERROR` without touching a connection
// that was working. A first connection that ends well brings its history.
export function finishRunningRuns(database: MockState.Database): void {
  for (const entry of database.runs) {
    if (entry.run.status !== 'running') continue;
    const connection = database.connections.find((item) => item.id === entry.connectionId);
    const outcome = connection ? readItemOutcome(connection.pluggyItemId) : { type: 'ok' as const };
    const firstConnection = entry.run.trigger === 'first_connection';
    const closed = { ...entry.run, finishedAt: NOW_ISO };

    if (outcome.type === 'failed') {
      entry.run = { ...closed, status: 'error', errorCode: outcome.code };
      if (connection) {
        connection.status = 'error';
        connection.errorCode = outcome.code;
      }
      continue;
    }
    if (outcome.type === 'unreachable') {
      entry.run = { ...closed, status: 'error', errorCode: 'PROVIDER_ERROR' };
      continue;
    }
    if (outcome.type === 'updating') {
      entry.run = { ...closed, status: 'success', createdCount: 0 };
      continue;
    }

    let brought: MockState.TransactionRecord[] = [];
    if (connection && firstConnection) {
      if (connection.accountIds.length === 0) brought = importNewItem(database, connection);
      else refreshBalances(database, connection);
    }
    entry.run = { ...closed, status: 'success', createdCount: brought.length };
    if (!connection) continue;

    connection.status = 'active';
    connection.errorCode = null;
    connection.lastBankUpdateAt = NOW_ISO;
    connection.lastSuccessAt = NOW_ISO;
    if (firstConnection) {
      // The oldest day brought; nothing brought, no day (even with the history done).
      const days = brought.map((tx) => tx.occurredOn).sort();
      connection.history = {
        status: 'done',
        fromOn: days[0] ?? null,
        transactionCount: brought.length,
      };
    }
  }
}
