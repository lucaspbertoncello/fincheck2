import type { ScreenKey, TabKey } from '#/shared/types/screen.type.ts';

/** Fixed order of the top tabs. It decides the direction of the page transition, not the history. */
export const TAB_ORDER: readonly TabKey[] = [
  'overview',
  'transactions',
  'recurrences',
  'accounts',
  'categories',
  'profile',
];

/**
 * Fixed order of the screens that have sub-tabs (Recorrências | A pagar e receber | Assinaturas, Categorias |
 * Regras). It decides the direction of the transition between two sub-tabs of the same tab.
 */
export const SUB_SCREEN_ORDER: readonly ScreenKey[] = [
  'recurrences',
  'bills',
  'subscriptions',
  'categories',
  'rules',
];

/** Order of the Configurações pages, left to right in the side menu: a later page slides forward. */
export const SETTINGS_PAGE_ORDER = [
  '/settings/connections',
  '/settings/data',
  '/settings/appearance',
] as const;

/** Position of the phone list of Configurações (`/settings`) among its pages: before the first. */
export const SETTINGS_LIST_INDEX = -0.5;
