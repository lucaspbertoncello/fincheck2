import type { ScreenKey, TabKey } from '#/shared/types/screen.type.ts';

/** Fixed order of the top tabs. It decides the direction of the page transition, not the history. */
export const TAB_ORDER: readonly TabKey[] = [
  'overview',
  'transactions',
  'recurrences',
  'accounts',
  'categories',
];

/**
 * Fixed order of the screens that have sub-tabs (Recorrências | A pagar e receber, Categorias |
 * Regras). It decides the direction of the transition between two sub-tabs of the same tab.
 */
export const SUB_SCREEN_ORDER: readonly ScreenKey[] = [
  'recurrences',
  'bills',
  'categories',
  'rules',
];
