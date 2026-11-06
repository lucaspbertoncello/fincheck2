import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TagsTable } from '#/database/tables/categories/tags-table.type.ts';
import type { TransactionUsageReader } from '#/modules/categories/application/usage/transaction-usage-reader.interface.ts';

// Rows of `tags` into `Tag.Dto`: adds the number of transactions with the tag, which the owner of
// the transactions answers through its port.
export class TagPresenter {
  private readonly db: Kysely<Database>;
  private readonly usage: TransactionUsageReader;

  constructor(db: Kysely<Database>, usage: TransactionUsageReader) {
    this.db = db;
    this.usage = usage;
  }

  async present(
    rows: Selectable<TagsTable>[],
    executor: Kysely<Database> = this.db,
  ): Promise<Tag.Dto[]> {
    if (rows.length === 0) return [];
    const counts = await this.usage.ofTags(
      rows.map((row) => row.id),
      executor,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      archivedAt: row.archived_at,
      transactionCount: counts.get(row.id) ?? 0,
    }));
  }

  async presentOne(
    row: Selectable<TagsTable>,
    executor: Kysely<Database> = this.db,
  ): Promise<Tag.Dto> {
    const [dto] = await this.present([row], executor);
    if (dto === undefined) throw new RangeError('The presenter answered no tag');

    return dto;
  }
}
