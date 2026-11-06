import type { AccountMovementReader } from '#/modules/accounts/application/account/account-movement-reader.interface.ts';
import type { CreateBalanceAdjustment } from '#/modules/accounts/application/account/create-balance-adjustment.interface.ts';
import type { ManualBalanceReader } from '#/modules/accounts/application/account/manual-balance-reader.interface.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';

type LedgerEntry = { accountId: string; amountCents: number; occurredOn: string; note?: string };

// The part of `transactions` that `accounts` talks to, over an array: the balance of a manual
// account, the movement by day and the recording of an adjustment. `today` limits the balance.
export function createInMemoryLedger(today: string, entries: LedgerEntry[] = []) {
  const ledger: LedgerEntry[] = [...entries];
  const adjustments: CreateBalanceAdjustment.Input[] = [];
  const ofAccount = (accountId: string) => ledger.filter((entry) => entry.accountId === accountId);

  const manualBalances: ManualBalanceReader = {
    async balancesOf(accountIds) {
      return new Map(
        accountIds.map((accountId) => [
          accountId,
          ofAccount(accountId)
            .filter((entry) => entry.occurredOn <= today)
            .reduce((sum, entry) => sum + entry.amountCents, 0),
        ]),
      );
    },
  };

  const movements: AccountMovementReader = {
    async netUntil(accountId, upTo) {
      return ofAccount(accountId)
        .filter((entry) => entry.occurredOn <= upTo.value)
        .reduce((sum, entry) => sum + entry.amountCents, 0);
    },
    async netByDay(accountId, from, to) {
      const byDay = new Map<string, number>();
      for (const entry of ofAccount(accountId)) {
        if (entry.occurredOn < from.value || entry.occurredOn > to.value) continue;
        byDay.set(entry.occurredOn, (byDay.get(entry.occurredOn) ?? 0) + entry.amountCents);
      }

      return byDay;
    },
  };

  const balanceAdjustments: CreateBalanceAdjustment = {
    async execute(input) {
      adjustments.push(input);
      ledger.push({
        accountId: input.accountId,
        amountCents: input.amountCents,
        occurredOn: input.occurredOn,
      });

      return { transactionId: generateId() };
    },
  };

  return { ledger, adjustments, manualBalances, movements, balanceAdjustments };
}
