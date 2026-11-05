import {
  categoryTrendDtoSchema,
  categoryTrendQuerySchema,
} from '@fincheck/shared/dashboard/category-trend/category-trend.schema.ts';
import { http } from 'msw';

import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { buildLines } from '#mocks/transactions/transaction/build-lines.util.ts';

// The 12 months up to `until`, oldest first, summed by competence as `GET /dashboard/categories`
// does: ignored transactions stay out and a split one counts by its parts. No sign.
export const categoryTrendMock = [
  http.get(
    '/api/dashboard/categories/:id/trend',
    handleRoute(
      { query: categoryTrendQuerySchema, response: categoryTrendDtoSchema },
      ({ params, query }) => {
        const category = findCategory(db, params['id'] ?? '');
        const until = query.until ?? CURRENT_MONTH;
        const lines = buildLines(db).filter((line) => line.categoryId === category.id);

        return {
          categoryId: category.id,
          kind: category.kind,
          months: Array.from({ length: 12 }, (_, index) => {
            const month = addMonths(until, index - 11);
            const mine = lines.filter((line) => line.competenceOn.slice(0, 7) === month);

            return {
              month,
              totalCents: Math.abs(mine.reduce((sum, line) => sum + line.amountCents, 0)),
              transactionCount: new Set(mine.map((line) => line.transactionId)).size,
            };
          }),
        };
      },
    ),
  ),
];
