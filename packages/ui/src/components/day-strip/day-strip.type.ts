/** Who the marker belongs to: the green income or the red expense. */
export type DayMarkerFlow = 'income' | 'expense';

/** Where the occurrence is: happened (filled), expected (hollow), partial (half), late, different amount. */
export type DayMarkerStatus = 'happened' | 'expected' | 'partial' | 'late' | 'different';

export type DayMarker = {
  flow: DayMarkerFlow;
  status: DayMarkerStatus;
};

/** One day of the strip, ready-made by the screen. */
export type DayStripDay<TItem = unknown> = {
  /** Business date, `YYYY-MM-DD`. */
  date: string;
  /** Projected balance of the day in integer cents (the "projection" strip). Absent = no figure. */
  totalCents?: number;
  /** Sum of what comes in that day, in integer cents (the "Dia" and "Semana" views). */
  inCents?: number;
  /** Sum of what goes out that day, a positive magnitude in integer cents. */
  outCents?: number;
  /** Markers of the day's occurrences (the "occurrences" strip). */
  markers?: readonly DayMarker[];
  /** What goes in and out that day; the detail below the strip renders them. */
  items: readonly TItem[];
};

/**
 * "projection": 10 days with the projected balance (Visão geral, "Até o fim do mês").
 * "occurrences": the whole month with markers, scrolling sideways (Recorrentes, "dia a dia").
 */
export type DayStripVariant = 'projection' | 'occurrences';

/** The two views of "Até o fim do mês": one day at a time in a slider, or the weeks that are left. */
export type DayStripMode = 'day' | 'week';

/** One week of the "Semana" view, built from the days (Sunday to Saturday, cut at the shown days). */
export type WeekSummary<TItem = unknown> = {
  /** The Sunday that opens the week, `YYYY-MM-DD`. Unique, so it works as a key. */
  key: string;
  /** First and last shown day of the week (`YYYY-MM-DD`). */
  startDate: string;
  endDate: string;
  inCents: number;
  outCents: number;
  /** Projected balance at the end of the week; absent when the API gave none. */
  endBalanceCents?: number;
  /** The week that holds today. */
  isCurrent: boolean;
  items: readonly TItem[];
};
