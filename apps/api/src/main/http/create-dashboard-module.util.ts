import { Hono } from 'hono';

import { AgendaLoader } from '#/modules/dashboard/application/agenda/agenda-loader.service.ts';
import { GetAgendaQuery } from '#/modules/dashboard/application/agenda/get-agenda.query.ts';
import type { AgendaBillReader } from '#/modules/dashboard/application/bill/agenda-bill-reader.interface.ts';
import type { TrendCategoryReader } from '#/modules/dashboard/application/category/trend-category-reader.interface.ts';
import { GetCategoryBreakdownQuery } from '#/modules/dashboard/application/category-breakdown/get-category-breakdown.query.ts';
import { GetCategoryTrendQuery } from '#/modules/dashboard/application/category-trend/get-category-trend.query.ts';
import type { ConnectionReader } from '#/modules/dashboard/application/connection/connection-reader.interface.ts';
import type { AgendaInvoiceReader } from '#/modules/dashboard/application/invoice/agenda-invoice-reader.interface.ts';
import { GetFreeBalanceQuery } from '#/modules/dashboard/application/free-balance/get-free-balance.query.ts';
import { GetMonthSummaryQuery } from '#/modules/dashboard/application/month-summary/get-month-summary.query.ts';
import type { AgendaOccurrenceReader } from '#/modules/dashboard/application/occurrence/agenda-occurrence-reader.interface.ts';
import type { OccurrenceEnsurer } from '#/modules/dashboard/application/occurrence/occurrence-ensurer.interface.ts';
import type { ReviewReader } from '#/modules/dashboard/application/review/review-reader.interface.ts';
import { GetSpendHeatmapQuery } from '#/modules/dashboard/application/spend-heatmap/get-spend-heatmap.query.ts';
import { GetSpendingCurveQuery } from '#/modules/dashboard/application/spending-curve/get-spending-curve.query.ts';
import type { SpendingLineReader } from '#/modules/dashboard/application/spending-line/spending-line-reader.interface.ts';
import { GetTimelineQuery } from '#/modules/dashboard/application/timeline/get-timeline.query.ts';
import type { DashboardAccountReader } from '#/modules/dashboard/application/account/dashboard-account-reader.interface.ts';
import { GetAgendaController } from '#/modules/dashboard/http/agenda/get-agenda.controller.ts';
import { createAgendaRoute } from '#/modules/dashboard/http/agenda/agenda.route.ts';
import { GetCategoryBreakdownController } from '#/modules/dashboard/http/category-breakdown/get-category-breakdown.controller.ts';
import { createCategoryBreakdownRoute } from '#/modules/dashboard/http/category-breakdown/category-breakdown.route.ts';
import { GetCategoryTrendController } from '#/modules/dashboard/http/category-trend/get-category-trend.controller.ts';
import { createCategoryTrendRoute } from '#/modules/dashboard/http/category-trend/category-trend.route.ts';
import { GetFreeBalanceController } from '#/modules/dashboard/http/free-balance/get-free-balance.controller.ts';
import { createFreeBalanceRoute } from '#/modules/dashboard/http/free-balance/free-balance.route.ts';
import { GetMonthSummaryController } from '#/modules/dashboard/http/month-summary/get-month-summary.controller.ts';
import { createMonthSummaryRoute } from '#/modules/dashboard/http/month-summary/month-summary.route.ts';
import { GetSpendHeatmapController } from '#/modules/dashboard/http/spend-heatmap/get-spend-heatmap.controller.ts';
import { createSpendHeatmapRoute } from '#/modules/dashboard/http/spend-heatmap/spend-heatmap.route.ts';
import { GetSpendingCurveController } from '#/modules/dashboard/http/spending-curve/get-spending-curve.controller.ts';
import { createSpendingCurveRoute } from '#/modules/dashboard/http/spending-curve/spending-curve.route.ts';
import { GetTimelineController } from '#/modules/dashboard/http/timeline/get-timeline.controller.ts';
import { createTimelineRoute } from '#/modules/dashboard/http/timeline/timeline.route.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// Builds the `dashboard` module by hand: its routes (the Livre, the summary of the month, the
// curve and the map of spending, the categories and their trend, the timeline and the agenda).
// It has no table and writes nothing: it reads every owner through a port, and every number is
// worked out by pure functions of `domain/`. The ports: `accounts` (the balances), `invoices` (the
// invoices still to pay and the ones paid), `bills` (the bills and the presumed payment),
// `recurrences` (the occurrences of a month, and the use case that creates the missing ones, called
// before the reads that depend on them), `transactions` (the lines of spending and income by
// competence, and the queue "Para revisar"), `categories` (the kind of a category) and, once it
// exists, `sync` (the connections, for the freshness seal and the alerts: without it there are none
// to show). Only `connections` is optional; leaving out any other makes the app fail to answer, and
// the tests of `createApp` catch it.
export function createDashboardModule(deps: {
  clock: Clock;
  ensureOccurrences: OccurrenceEnsurer;
  accounts: DashboardAccountReader;
  invoices: AgendaInvoiceReader;
  bills: AgendaBillReader;
  occurrences: AgendaOccurrenceReader;
  lines: SpendingLineReader;
  reviews: ReviewReader;
  categories: TrendCategoryReader;
  connections?: ConnectionReader | undefined;
}) {
  const { clock, ensureOccurrences, lines, reviews, occurrences, connections } = deps;
  const loader = new AgendaLoader(deps.accounts, deps.invoices, deps.bills, occurrences, clock);

  const routes = new Hono()
    .route(
      '/',
      createFreeBalanceRoute({
        getFreeBalance: new GetFreeBalanceController(
          ensureOccurrences,
          new GetFreeBalanceQuery(loader, reviews, connections, clock),
        ),
      }),
    )
    .route(
      '/',
      createMonthSummaryRoute({
        getMonthSummary: new GetMonthSummaryController(
          ensureOccurrences,
          new GetMonthSummaryQuery(loader, occurrences, lines, connections, clock),
        ),
      }),
    )
    .route(
      '/',
      createSpendingCurveRoute({
        getSpendingCurve: new GetSpendingCurveController(new GetSpendingCurveQuery(lines, clock)),
      }),
    )
    .route(
      '/',
      createSpendHeatmapRoute({
        getSpendHeatmap: new GetSpendHeatmapController(new GetSpendHeatmapQuery(lines, clock)),
      }),
    )
    .route(
      '/',
      createCategoryBreakdownRoute({
        getCategoryBreakdown: new GetCategoryBreakdownController(
          ensureOccurrences,
          new GetCategoryBreakdownQuery(lines, reviews, occurrences, clock),
        ),
      }),
    )
    .route(
      '/',
      createCategoryTrendRoute({
        getCategoryTrend: new GetCategoryTrendController(
          new GetCategoryTrendQuery(deps.categories, lines, clock),
        ),
      }),
    )
    .route(
      '/',
      createTimelineRoute({
        getTimeline: new GetTimelineController(
          ensureOccurrences,
          new GetTimelineQuery(loader, clock),
        ),
      }),
    )
    .route(
      '/',
      createAgendaRoute({
        getAgenda: new GetAgendaController(ensureOccurrences, new GetAgendaQuery(loader)),
      }),
    );

  return { routes };
}
