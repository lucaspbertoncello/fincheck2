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
