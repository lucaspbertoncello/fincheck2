import type { TabKey } from '#/shared/types/screen.type.ts';

/** Fixed order of the top tabs. It decides the direction of the page transition, not the history. */
export const TAB_ORDER: readonly TabKey[] = [
  'overview',
  'transactions',
  'recurrences',
  'accounts',
  'categories',
];
