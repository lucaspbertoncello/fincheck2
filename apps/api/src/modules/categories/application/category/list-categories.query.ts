import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CategoryPresenter } from '#/modules/categories/application/category/category-presenter.service.ts';

// By name, with no difference for case or accent, then by id.
const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

// The categories of the management screen and of every choice in the app (`GET /categories`).
export class ListCategoriesQuery {
  private readonly db: Kysely<Database>;
  private readonly presenter: CategoryPresenter;

  constructor(db: Kysely<Database>, presenter: CategoryPresenter) {
    this.db = db;
    this.presenter = presenter;
  }

  async execute(input: ListCategoriesQuery.Input): Promise<ListCategoriesQuery.Output> {
    let query = this.db.selectFrom('categories').selectAll();
    if (input.kind) query = query.where('kind', '=', input.kind);
    if (input.status === 'active') query = query.where('archived_at', 'is', null);
    if (input.status === 'archived') query = query.where('archived_at', 'is not', null);
    const rows = await query.execute();

    rows.sort((a, b) => nameCollator.compare(a.name, b.name) || a.id.localeCompare(b.id));

    return { items: await this.presenter.present(rows) };
  }
}

export namespace ListCategoriesQuery {
  export type Input = Category.ListQuery;
  export type Output = { items: Category.Dto[] };
}
