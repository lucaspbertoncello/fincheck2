import { sql, type Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Owner: `categories`. A tag now belongs to one category (`category_id`, required) and its name is
// unique inside it (PM, 09/11/2026). The loose tags that exist go to the category most used by the
// transactions that have them (a tie: the category with the smaller name in alphabetical order); a
// tag used in several categories stays in the most used one and the transactions of the others
// lose the link; a tag with no categorized transaction is deleted. A split transaction has no
// category of its own: the categories of its parts count (once per transaction) both to choose the
// category of the tag and to keep the link, so a tag that only exists on split transactions is not
// lost. A transaction whose tag went to another category loses that tag; a rule keeps only the tags of the category it puts, and a rule left with no action
// (tags only) is deleted. SQLite cannot add a required reference to a table in place, so `tags` is
// rebuilt: the foreign keys are off while it is (they cannot be toggled inside a transaction, and
// the migrator of SQLite does not open one) and checked and turned on again after.
const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

type Usage = { tag_id: string; category_id: string; used: number };

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db);
  try {
    await db.transaction().execute(async (trx) => {
      const tags = (
        await sql<{
          id: string;
          name: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        }>`SELECT id, name, archived_at, created_at, updated_at FROM tags`.execute(trx)
      ).rows;
      const categoryNames = new Map(
        (
          await sql<{ id: string; name: string }>`SELECT id, name FROM categories`.execute(trx)
        ).rows.map((row) => [row.id, row.name]),
      );
      const usages = (
        await sql<Usage>`
          SELECT tag_id, category_id, COUNT(*) AS used FROM (
            SELECT tt.tag_id AS tag_id, t.category_id AS category_id, t.id AS transaction_id
            FROM transaction_tags tt
            JOIN transactions t ON t.id = tt.transaction_id
            WHERE t.category_id IS NOT NULL
            UNION
            SELECT tt.tag_id, s.category_id, tt.transaction_id
            FROM transaction_tags tt
            JOIN transaction_splits s ON s.transaction_id = tt.transaction_id
            WHERE s.category_id IS NOT NULL)
          GROUP BY tag_id, category_id`.execute(trx)
      ).rows;

      const usagesByTag = new Map<string, Usage[]>();
      for (const usage of usages) {
        usagesByTag.set(usage.tag_id, [...(usagesByTag.get(usage.tag_id) ?? []), usage]);
      }
      const categoryOf = new Map<string, string>();
      for (const tag of tags) {
        const best = [...(usagesByTag.get(tag.id) ?? [])].sort(
          (a, b) =>
            b.used - a.used ||
            nameCollator.compare(
              categoryNames.get(a.category_id) ?? '',
              categoryNames.get(b.category_id) ?? '',
            ) ||
            a.category_id.localeCompare(b.category_id),
        )[0];
        if (best) categoryOf.set(tag.id, best.category_id);
      }

      for (const tag of tags) {
        if (categoryOf.has(tag.id)) continue;
        await sql`DELETE FROM transaction_tags WHERE tag_id = ${tag.id}`.execute(trx);
        await sql`DELETE FROM category_rule_tags WHERE tag_id = ${tag.id}`.execute(trx);
      }

      await executeStatements(trx, [
        `CREATE TABLE tags_scoped (
          id TEXT NOT NULL PRIMARY KEY,
          category_id TEXT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
          name TEXT NOT NULL,
          archived_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT`,
      ]);
      for (const tag of tags) {
        const categoryId = categoryOf.get(tag.id);
        if (categoryId === undefined) continue;
        await sql`INSERT INTO tags_scoped (id, category_id, name, archived_at, created_at, updated_at)
          VALUES (${tag.id}, ${categoryId}, ${tag.name}, ${tag.archived_at}, ${tag.created_at}, ${tag.updated_at})`.execute(
          trx,
        );
      }

      await executeStatements(trx, [
        `DROP TABLE tags`,
        `ALTER TABLE tags_scoped RENAME TO tags`,
        `CREATE UNIQUE INDEX tags_category_name_unique ON tags (category_id, name COLLATE NOCASE)`,

        // A transaction only keeps the tags of its own category or, when split, of a part.
        `DELETE FROM transaction_tags WHERE NOT EXISTS (
          SELECT 1 FROM transactions t JOIN tags g ON g.id = transaction_tags.tag_id
          WHERE t.id = transaction_tags.transaction_id AND (
            t.category_id = g.category_id
            OR EXISTS (SELECT 1 FROM transaction_splits s
              WHERE s.transaction_id = t.id AND s.category_id = g.category_id)))`,
        // A rule only keeps the tags of the category it puts.
        `DELETE FROM category_rule_tags WHERE NOT EXISTS (
          SELECT 1 FROM category_rules r JOIN tags g ON g.id = category_rule_tags.tag_id
          WHERE r.id = category_rule_tags.rule_id AND r.category_id = g.category_id)`,
      ]);

      const broken = (await sql`PRAGMA foreign_key_check`.execute(trx)).rows;
      if (broken.length > 0) throw new Error('The tags migration left a broken foreign key');
    });
  } finally {
    await sql`PRAGMA foreign_keys = ON`.execute(db);
  }

  // With the keys on again: a rule that only added tags has nothing left to do (a rule with no
  // category and no tag), so it goes away (`ON DELETE CASCADE` takes its links).
  await sql`DELETE FROM category_rules WHERE category_id IS NULL`.execute(db);
}

// Back to loose tags. Names that repeat across categories get a number so the global unique index
// holds.
export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db);
  try {
    await db.transaction().execute(async (trx) => {
      const tags = (
        await sql<{
          id: string;
          name: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        }>`SELECT id, name, archived_at, created_at, updated_at FROM tags ORDER BY created_at, id`.execute(
          trx,
        )
      ).rows;

      await executeStatements(trx, [
        `CREATE TABLE tags_loose (
          id TEXT NOT NULL PRIMARY KEY,
          name TEXT NOT NULL,
          archived_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT`,
      ]);
      const taken = new Set<string>();
      for (const tag of tags) {
        let name = tag.name;
        for (let n = 2; taken.has(name.toLowerCase()); n += 1) name = `${tag.name} (${String(n)})`;
        taken.add(name.toLowerCase());
        await sql`INSERT INTO tags_loose (id, name, archived_at, created_at, updated_at)
          VALUES (${tag.id}, ${name}, ${tag.archived_at}, ${tag.created_at}, ${tag.updated_at})`.execute(
          trx,
        );
      }

      await executeStatements(trx, [
        `DROP TABLE tags`,
        `ALTER TABLE tags_loose RENAME TO tags`,
        `CREATE UNIQUE INDEX tags_name_unique ON tags (name COLLATE NOCASE)`,
      ]);
    });
  } finally {
    await sql`PRAGMA foreign_keys = ON`.execute(db);
  }
}
