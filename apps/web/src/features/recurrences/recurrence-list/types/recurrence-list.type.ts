import type {
  IconName,
  RecurrenceFlow,
  RecurrenceInlineAction,
  RecurrenceStatus,
} from '@fincheck/ui';

/** One occurrence of the month, ready for `RecurrenceRow`. */
export type OccurrenceRowData = {
  occurrenceId: string;
  recurrenceId: string;
  name: string;
  icon: IconName;
  flow: RecurrenceFlow;
  /** "Todo dia 20", "Por volta do dia 25". */
  rule: string;
  /** Sender or account beside the rule. */
  account?: string;
  status: RecurrenceStatus;
  statusNote?: string;
  amountCents: number;
  /** Partial only: the full expected amount. */
  totalCents?: number;
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
