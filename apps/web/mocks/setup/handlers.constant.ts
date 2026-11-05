import { accountMock } from '#mocks/accounts/account/account.mock.ts';
import { backupMock } from '#mocks/backup/backup/backup.mock.ts';
import { billMock } from '#mocks/bills/bill/bill.mock.ts';
import { categoryMock } from '#mocks/categories/category/category.mock.ts';
import { ruleMock } from '#mocks/categories/rule/rule.mock.ts';
import { ruleSuggestionMock } from '#mocks/categories/rule-suggestion/rule-suggestion.mock.ts';
import { tagMock } from '#mocks/categories/tag/tag.mock.ts';
import { agendaMock } from '#mocks/dashboard/agenda/agenda.mock.ts';
import { categoryBreakdownMock } from '#mocks/dashboard/category-breakdown/category-breakdown.mock.ts';
import { freeBalanceMock } from '#mocks/dashboard/free-balance/free-balance.mock.ts';
import { monthSummaryMock } from '#mocks/dashboard/month-summary/month-summary.mock.ts';
import { spendingCurveMock } from '#mocks/dashboard/spending-curve/spending-curve.mock.ts';
import { spendHeatmapMock } from '#mocks/dashboard/spend-heatmap/spend-heatmap.mock.ts';
import { timelineMock } from '#mocks/dashboard/timeline/timeline.mock.ts';
import { healthMock } from '#mocks/health/health/health.mock.ts';
import { profileHighlightsMock } from '#mocks/profile/highlights/profile-highlights.mock.ts';
import { profileMock } from '#mocks/profile/profile/profile.mock.ts';
import { invoiceMock } from '#mocks/invoices/invoice/invoice.mock.ts';
import { occurrenceMock } from '#mocks/recurrences/occurrence/occurrence.mock.ts';
import { recurrenceMock } from '#mocks/recurrences/recurrence/recurrence.mock.ts';
import { connectionMock } from '#mocks/sync/connection/connection.mock.ts';
import { installmentPlanMock } from '#mocks/transactions/installment-plan/installment-plan.mock.ts';
import { transactionMock } from '#mocks/transactions/transaction/transaction.mock.ts';

// Every route of the approved contract. They all share the in-memory state in
// `mocks/state/mock-database.store.ts`, so a change made by one shows in the others.
export const handlers = [
  healthMock,
  ...accountMock,
  ...transactionMock,
  ...installmentPlanMock,
  ...invoiceMock,
  ...recurrenceMock,
  ...occurrenceMock,
  ...billMock,
  ...categoryMock,
  ...tagMock,
  ...ruleMock,
  ...ruleSuggestionMock,
  ...freeBalanceMock,
  ...monthSummaryMock,
  ...spendingCurveMock,
  ...categoryBreakdownMock,
  ...spendHeatmapMock,
  ...timelineMock,
  ...agendaMock,
  ...connectionMock,
  ...backupMock,
  ...profileMock,
  ...profileHighlightsMock,
];
