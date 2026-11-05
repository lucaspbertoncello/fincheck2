/** Intensity of a day: 0 is "no spending", 1 to 4 are the quartiles the API computed. */
export type SpendHeatmapLevel = 0 | 1 | 2 | 3 | 4;

export type SpendHeatmapDay = {
  /** Business date, `YYYY-MM-DD`. */
  date: string;
  /** Spent that day, in cents. */
  totalCents: number;
  /** 0 to 4 (anything else is pulled into that range). */
  level: number;
};

/** The days in columns of weeks (Sunday first): `weeks[column][weekday]`, `null` where the map has no day. */
export type SpendHeatmapGrid = {
  weeks: (SpendHeatmapDay | null)[][];
  monthLabels: { column: number; label: string }[];
};

/** "year": a column per week (January to December). "month": a calendar, a row per week. */
export type SpendHeatmapView = 'year' | 'month';
