import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { CountReviewQuery } from '#/modules/transactions/application/spending-line/count-review.query.ts';
import { ListCompetenceLinesQuery } from '#/modules/transactions/application/spending-line/list-competence-lines.query.ts';

// What `dashboard` asks of `transactions`: the lines of spending and income by competence and the
// size of the queue "Para revisar". Only reads, so there is no circle to break.
export function createTransactionsDashboardPorts(deps: { db: Kysely<Database> }) {
  return {
    lines: new ListCompetenceLinesQuery(deps.db),
    reviews: new CountReviewQuery(deps.db),
  };
}
