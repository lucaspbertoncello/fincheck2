import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';

import type { TrendCategoryReader } from '#/modules/dashboard/application/category/trend-category-reader.interface.ts';
import type { SpendingLineReader } from '#/modules/dashboard/application/spending-line/spending-line-reader.interface.ts';
import { computeCategoryTrend } from '#/modules/dashboard/domain/category-trend/compute-category-trend.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The 12 months of a category (BR-CAT-010), the bars of its page: the same sum as the breakdown
// (competence, no ignored transaction, a split one by its parts). `until` is the last month, the
// current one by default. A category that does not exist is a 404 (`CATEGORY_NOT_FOUND`).
export class GetCategoryTrendQuery {
  private readonly categories: TrendCategoryReader;
  private readonly lines: SpendingLineReader;
  private readonly clock: Clock;

  constructor(categories: TrendCategoryReader, lines: SpendingLineReader, clock: Clock) {
    this.categories = categories;
    this.lines = lines;
    this.clock = clock;
  }

  async execute(input: GetCategoryTrendQuery.Input): Promise<GetCategoryTrendQuery.Output> {
    const until = input.until ? Month.of(input.until) : Month.containing(this.clock.today());
    assertSupportedMonth(until, 'until');
    const category = await this.categories.requireCategory(input.id);

    let first = until;
    for (let count = 1; count < 12; count++) first = first.previous();
    const lines = await this.lines.listLines({
      kind: category.kind,
      categoryId: category.id,
      from: first.firstDay().value,
      to: until.lastDay().value,
    });

    return {
      categoryId: category.id,
      kind: category.kind,
      months: computeCategoryTrend({
        until,
        kind: category.kind,
        lines: lines.map((line) => ({
          transactionId: line.transactionId,
          on: line.on,
          amountCents: line.amountCents,
        })),
      }),
    };
  }
}

export namespace GetCategoryTrendQuery {
  export type Input = { id: string; until?: string | undefined };
  export type Output = CategoryBreakdown.Trend;
}
