import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TagPresenter } from '#/modules/categories/application/tag/tag-presenter.service.ts';

// By name, with no difference for case or accent, then by id.
const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

// The tags of the screen and of the choices (`GET /tags`).
export class ListTagsQuery {
  private readonly db: Kysely<Database>;
  private readonly presenter: TagPresenter;

  constructor(db: Kysely<Database>, presenter: TagPresenter) {
    this.db = db;
    this.presenter = presenter;
  }

  async execute(input: ListTagsQuery.Input): Promise<ListTagsQuery.Output> {
    let query = this.db.selectFrom('tags').selectAll();
    if (!input.includeArchived) query = query.where('archived_at', 'is', null);
    if (input.categoryId !== undefined) query = query.where('category_id', '=', input.categoryId);
    const rows = await query.execute();

    rows.sort((a, b) => nameCollator.compare(a.name, b.name) || a.id.localeCompare(b.id));

    return { items: await this.presenter.present(rows) };
  }
}

export namespace ListTagsQuery {
  export type Input = Tag.ListQuery;
  export type Output = { items: Tag.Dto[] };
}
