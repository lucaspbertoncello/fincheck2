import type {
  IconName,
  RecurrenceFlow,
  RecurrenceInlineAction,
  RecurrenceStatus,
  RecurrenceTransaction,
  ServiceLogoData,
} from '@fincheck/ui';

/** One occurrence of the month, ready for `RecurrenceRow`. */
export type OccurrenceRowData = {
  occurrenceId: string;
  recurrenceId: string;
  name: string;
  icon: IconName;
  /** The service the name or the matching text points to (its logo); null shows the category icon. */
  service: ServiceLogoData | null;
  flow: RecurrenceFlow;
  /** "Todo dia 20", "Por volta do dia 25". */
  rule: string;
  /** Sender or account beside the rule. */
  account?: string;
  status: RecurrenceStatus;
  statusNote?: string;
  /** What came in; the expected amount while nothing did. */
  amountCents: number;
  /** Something came in: the expected amount ("≈ R$ 2.600,00 previstos"). */
  expectedCents?: number;
  /** Something came in and part is open: what is missing. */
  remainingCents?: number;
  /** What came in above the expected amount. */
  excessCents?: number;
  /** What the day list of the strip shows (what came in, else the expected amount). */
  agendaAmountCents: number;
  /** A late one brought from an earlier month. */
  carriedOver: boolean;
  /** The transactions linked to it this month, for the open row. */
  transactions: RecurrenceTransaction[];
  inlineActions: RecurrenceInlineAction[];
  /** Different amount waiting for an answer: what was charged and what was expected. */
  difference?: { newCents: number; keptCents: number };
  /** A mutation of this row is running. */
  pending: boolean;
};

/** A recurrence with no occurrence in the month (paused or not started yet). */
export type IdleRecurrenceData = {
  recurrenceId: string;
  name: string;
  icon: IconName;
  service: ServiceLogoData | null;
  flow: RecurrenceFlow;
  rule: string;
  /** "Pausada" or "Começa em 11/2026". */
  note: string;
  paused: boolean;
  pending: boolean;
};

export type DayMarkerStatus = 'happened' | 'expected' | 'partial' | 'late' | 'different';

/** A day of the strip: its markers and the occurrences listed when it is chosen. */
export type OccurrenceDayData = {
  date: string;
  markers: { flow: RecurrenceFlow; status: DayMarkerStatus }[];
  items: OccurrenceRowData[];
};

export type OccurrenceChipData = { key: string; label: string; tone: 'warn' | 'neutral' };

export type ActionErrorData = { message: string; onRetry: () => void };
