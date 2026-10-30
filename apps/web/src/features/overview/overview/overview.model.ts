import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';
import type { ChartPoint, DayStripDay, DonutSlice, RemainingLineData } from '@fincheck/ui';

/** What one block of the screen is doing: each block loads, fails and retries on its own. */
export type SectionState<Data> =
  { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; data: Data };

/** The exception line under "Faltam N dias" ("Maxxy atrasado 2 dias, ver"). */
export type OverviewAlert = {
  key: string;
  message: string;
  href: string;
};

/** Ready-made props of the three summary cards. */
export type SummaryCardsData = {
  receivedCents: number;
  expectedCents: number;
  /** "Maxxy ainda vem". */
  pendingNote: string | undefined;
  spentCents: number;
  previousSamePointCents: number;
  previousTotalCents: number;
  /** "setembro". */
  previousMonthLabel: string;
  previousResultCents: number;
};

/** A day of the strip carries the timeline items of that day. */
export type StripDay = DayStripDay<Timeline.Item>;

export type StripData = {
  days: StripDay[];
  today: string;
  /** The chips under the day detail: late and undated items. */
  overdue: Timeline.Item[];
  undated: Timeline.Item[];
};

export type SpendData = {
  currentLabel: string;
  previousLabel: string;
  current: ChartPoint[];
  previous: ChartPoint[];
  today: number;
  daysInMonth: number;
};

/** The "onde mais cresceu" card. */
export type CategoryInsight = {
  categoryName: string;
  changeCents: number;
  changePct: number | null;
  transactionCount: number;
  previousMonthLabel: string;
};

export type CategoriesData = {
  slices: DonutSlice[];
  centerTitle: string;
  centerDetail: string | undefined;
  insight: CategoryInsight | undefined;
  /** "Delivery cresceu 108%", the line of the collapsed card on the phone. */
  collapsedSummary: string | undefined;
  hasSpending: boolean;
};

export type OverviewModel = {
  month: string;
  isDesktop: boolean;
  remaining: { isVisible: boolean; data: RemainingLineData | undefined };
  alerts: OverviewAlert[];
  summary: SectionState<SummaryCardsData>;
  strip: SectionState<StripData>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  spend: SectionState<SpendData>;
  categories: SectionState<CategoriesData>;
  billsHref: string;
  allCategoriesHref: string;
};
