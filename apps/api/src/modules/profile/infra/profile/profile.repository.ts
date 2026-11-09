import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Profile } from '#/modules/profile/domain/profile/profile.entity.ts';
import type { ProfileRepository } from '#/modules/profile/domain/profile/profile-repository.interface.ts';
import { ProfileItem } from '#/modules/profile/infra/profile/profile.item.ts';

// The store of the profile on SQLite. Every method accepts the executor of a unit of work; without
// it, it uses the default connection.
export class KyselyProfileRepository implements ProfileRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async find(executor: Kysely<Database> = this.db): Promise<Profile | null> {
    const row = await executor
      .selectFrom('profile')
      .selectAll()
      .where('id', '=', 1)
      .executeTakeFirst();

    return row ? ProfileItem.toDomain(row) : null;
  }

  async save(profile: Profile, executor: Kysely<Database> = this.db): Promise<void> {
    const row = ProfileItem.fromEntity(profile);

    await executor
      .insertInto('profile')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          name: row.name,
          initials: row.initials,
          avatar_id: row.avatar_id ?? null,
          updated_at: row.updated_at,
        }),
      )
      .execute();
  }
}
