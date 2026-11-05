// Every cache key of the `dashboard` context, in one place. `all` is the prefix that
// invalidates the whole context; the rest narrow it down.
export const dashboardKeys = {
  all: ['dashboard'] as const,
  freeBalance: () => ['dashboard', 'free-balance'] as const,
  monthSummary: (month: string) => ['dashboard', 'month-summary', month] as const,
  spendingCurve: (month: string) => ['dashboard', 'spending-curve', month] as const,
  categoryBreakdown: (month: string) => ['dashboard', 'category-breakdown', month] as const,
  // A free period, or all the history (both ends null).
  categoryBreakdownPeriod: (from: string | null, to: string | null) =>
    ['dashboard', 'category-breakdown', 'period', from, to] as const,
  timeline: (month: string, scope: string) => ['dashboard', 'timeline', month, scope] as const,
  spendHeatmap: (until: string) => ['dashboard', 'spend-heatmap', until] as const,
  agenda: (month: string) => ['dashboard', 'agenda', month] as const,
};
