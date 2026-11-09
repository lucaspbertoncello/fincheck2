import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import type { BankAccountImporter } from '#/modules/sync/application/import/bank-account-importer.service.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';
import type { TransactionLinkStore } from '#/modules/sync/application/import/transaction-link-store.interface.ts';
import { matchBankTransactions } from '#/modules/sync/domain/import/match-bank-transactions.util.ts';
import type { ExistingTransaction } from '#/modules/sync/domain/import/match-bank-transactions.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// The transactions of one account in a round (`domain model.md` 4.8). It tells which transaction the
// Pluggy sent is which in Fincheck (`matchBankTransactions`: the id of the Pluggy, the id the bank
// gives, 2 of 3 fields of the original), has `transactions` create the new ones and apply the bank's
// version to the others (the edit of Lucas stays), keeps the links up to date and, only after all
// that, has the ones that vanished from the window marked as removed. Importing the same window
// again creates nothing. Runs inside the unit of work of the round.
export class BankTransactionImporter {
  private readonly transactions: SyncTransactions;
  private readonly links: TransactionLinkStore<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    transactions: SyncTransactions,
    links: TransactionLinkStore<Kysely<Database>>,
    clock: Clock,
  ) {
    this.transactions = transactions;
    this.links = links;
    this.clock = clock;
  }

  async import(
    account: BankAccountImporter.Imported,
    executor: Kysely<Database>,
  ): Promise<BankTransactionImporter.Result> {
    const now = this.clock.now();
    const { accountId, fetched } = account;
    // The same id twice in the answer is one transaction (the last version, in the place it came
    // first): otherwise the second copy would be "new" in every round.
    const incoming = [...new Map(fetched.transactions.map((item) => [item.id, item])).values()];
    const byKey = new Map(incoming.map((transaction) => [transaction.id, transaction]));

    const rows = await this.transactions.listBank({ accountId, fromOn: fetched.fromOn }, executor);
    const rowLinks = await this.links.findByTransactionIds(
      rows.map((row) => row.transactionId),
      executor,
    );
    const existing: ExistingTransaction[] = rows.flatMap((row) => {
      const link = rowLinks.get(row.transactionId);

      return link
        ? [
            {
              transactionId: row.transactionId,
              pluggyId: link.pluggyId,
              providerRef: link.providerRef,
              bankDescription: row.bankDescription,
              bankAmountCents: row.bankAmountCents,
              bankOccurredOn: row.bankOccurredOn,
              isRemovedByBank: row.isRemovedByBank,
            },
          ]
        : [];
    });
    const incomingLinks = await this.links.findByPluggyIds([...byKey.keys()], executor);

    const match = matchBankTransactions({
      incoming: incoming.map((transaction) => ({
        key: transaction.id,
        providerRef: transaction.providerRef,
        description: transaction.description,
        amountCents: transaction.amountCents,
        occurredOn: transaction.occurredOn,
      })),
      linkedByPluggyId: new Map(
        [...incomingLinks].map(([pluggyId, link]) => [pluggyId, link.transactionId]),
      ),
      existing,
    });

    const versions: SyncTransactions.VersionUpdate[] = [];
    let created: SyncTransactions.Created[] = [];

    if (match.created.length > 0) {
      const output = await this.transactions.importNew(
        {
          accountId,
          items: match.created.flatMap((item) => {
            const transaction = byKey.get(item.key);

            return transaction ? [BankTransactionImporter.toImportItem(transaction)] : [];
          }),
        },
        executor,
      );
      created = output.created;
      for (const item of created) {
        await this.links.put(
          {
            pluggyId: item.key,
            transactionId: item.transactionId,
            providerRef: byKey.get(item.key)?.providerRef ?? null,
            lastSeenAt: now,
          },
          executor,
        );
      }
    }

    for (const matched of match.matched) {
      const transaction = byKey.get(matched.key);
      if (!transaction) continue;
      const current = incomingLinks.get(matched.key);
      // A link moves to the new id; a link that learned the id of the bank is brought up to date.
      if (
        matched.isRelinked ||
        (transaction.providerRef !== null && current?.providerRef !== transaction.providerRef)
      ) {
        await this.links.put(
          {
            pluggyId: matched.key,
            transactionId: matched.transactionId,
            providerRef: transaction.providerRef ?? current?.providerRef ?? null,
            lastSeenAt: now,
          },
          executor,
        );
      }
      versions.push(BankTransactionImporter.toVersion(transaction, matched.transactionId));
    }
    await this.links.touch(
      match.matched.map((matched) => matched.key),
      now,
      executor,
    );

    const applied =
      versions.length > 0
        ? await this.transactions.applyBankVersions({ updates: versions }, executor)
        : { updatedCount: 0 };
    // Only now, with everything of the round matched: what still vanished from the window is removed.
    const removed =
      match.removedTransactionIds.length > 0
        ? await this.transactions.markRemovedByBank(
            { transactionIds: match.removedTransactionIds },
            executor,
          )
        : { removedCount: 0 };

    return {
      created,
      updatedCount: applied.updatedCount,
      removedCount: removed.removedCount,
      oldestOn: incoming.map((transaction) => transaction.occurredOn).toSorted()[0] ?? null,
    };
  }

  private static toImportItem(
    transaction: BankDataProvider.Transaction,
  ): SyncTransactions.ImportItem {
    return {
      key: transaction.id,
      description: transaction.description,
      amountCents: transaction.amountCents,
      occurredOn: transaction.occurredOn,
      counterparty: transaction.counterparty,
      status: transaction.status,
      method: transaction.method,
      installment: transaction.installment,
    };
  }

  private static toVersion(
    transaction: BankDataProvider.Transaction,
    transactionId: string,
  ): SyncTransactions.VersionUpdate {
    return {
      transactionId,
      description: transaction.description,
      amountCents: transaction.amountCents,
      occurredOn: transaction.occurredOn,
      counterparty: transaction.counterparty,
      status: transaction.status,
    };
  }
}

export namespace BankTransactionImporter {
  export type Result = {
    created: SyncTransactions.Created[];
    updatedCount: number;
    removedCount: number;
    // The oldest day the Pluggy sent for the account; null when it sent nothing.
    oldestOn: string | null;
  };
}
