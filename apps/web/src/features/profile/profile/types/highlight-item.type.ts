import type { IconName } from '@fincheck/ui';
import type { ReactNode } from 'react';

export type HighlightKey =
  | 'largestPixSent'
  | 'largestPixReceived'
  | 'topCategory'
  | 'costliestMonth'
  | 'costliestWeekday'
  | 'longestNoSpendStreak';

/** The line under the number: "para Rafael" and "12 mar". The lead gives way (ellipsis) before the tail. */
export type HighlightContext = {
  lead?: string;
  tail: string;
};

/** One card of "Curiosidades": a fixed label and icon, and the figure and its context when there is data. */
export type HighlightItem = {
  key: HighlightKey;
  icon: IconName;
  label: string;
  /** The one number of the card; null when there is no data yet. */
  value: ReactNode | null;
  context: HighlightContext | null;
};
