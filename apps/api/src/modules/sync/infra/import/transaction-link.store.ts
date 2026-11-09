import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionLinkStore } from '#/modules/sync/application/import/transaction-link-store.interface.ts';

// The size of the groups of ids sent to SQLite at once: a first round brings thousands.
const CHUNK = 500;

// The links between the transactions of the Pluggy and the ones of Fincheck, on SQLite. Every
// method accepts the executor of a unit of work; without it, it uses the default connection.
export class KyselyTransactionLinkStore implements TransactionLinkStore<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findByPluggyIds(
    pluggyIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, TransactionLinkStore.Link>> {
    const found = new Map<string, TransactionLinkStore.Link>();

    for (const chunk of KyselyTransactionLinkStore.chunks(pluggyIds)) {
      const rows = await executor
        .selectFrom('sync_transaction_links')
        .selectAll()
        .where('pluggy_transaction_id', 'in', chunk)
        .execute();
      for (const row of rows)
        found.set(row.pluggy_transaction_id, KyselyTransactionLinkStore.toLink(row));
    }

    return found;
  }

  async findByTransactionIds(
    transactionIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, TransactionLinkStore.Link>> {
    const found = new Map<string, TransactionLinkStore.Link>();

    for (const chunk of KyselyTransactionLinkStore.chunks(transactionIds)) {
      const rows = await executor
        .selectFrom('sync_transaction_links')
        .selectAll()
        .where('transaction_id', 'in', chunk)
        .execute();
      for (const row of rows) found.set(row.transaction_id, KyselyTransactionLinkStore.toLink(row));
    }

    return found;
  }

  async put(link: TransactionLinkStore.Link, executor: Kysely<Database> = this.db): Promise<void> {
    // One link per transaction and one per id of the Pluggy: both old ones go, then the new one.
    await executor
      .deleteFrom('sync_transaction_links')
      .where((builder) =>
        builder.or([
          builder('transaction_id', '=', link.transactionId),
          builder('pluggy_transaction_id', '=', link.pluggyId),
        ]),
      )
      .execute();
    await executor
      .insertInto('sync_transaction_links')
      .values({
        pluggy_transaction_id: link.pluggyId,
        transaction_id: link.transactionId,
        provider_ref: link.providerRef,
        last_seen_at: link.lastSeenAt,
      })
      .execute();
  }

  async touch(
    pluggyIds: string[],
    seenAt: string,
    executor: Kysely<Database> = this.db,
  ): Promise<void> {
    for (const chunk of KyselyTransactionLinkStore.chunks(pluggyIds)) {
      await executor
        .updateTable('sync_transaction_links')
        .set({ last_seen_at: seenAt })
        .where('pluggy_transaction_id', 'in', chunk)
        .execute();
    }
  }

  private static chunks(ids: string[]): string[][] {
    const unique = [...new Set(ids)];
    const groups: string[][] = [];
    for (let start = 0; start < unique.length; start += CHUNK) {
      groups.push(unique.slice(start, start + CHUNK));
    }

    return groups;
  }

  private static toLink(row: {
    pluggy_transaction_id: string;
    transaction_id: string;
    provider_ref: string | null;
    last_seen_at: string;
  }): TransactionLinkStore.Link {
    return {
      pluggyId: row.pluggy_transaction_id,
      transactionId: row.transaction_id,
      providerRef: row.provider_ref,
      lastSeenAt: row.last_seen_at,
    };
  }
}
