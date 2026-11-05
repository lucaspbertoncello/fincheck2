import type { IconName } from '@fincheck/ui';

import type { TabKey } from '#/shared/types/screen.type.ts';

export type NavigationDefinition = {
  key: TabKey;
  label: string;
  shortLabel?: string;
  path: string;
  icon: IconName;
  /** False for Perfil: the phone bar holds five items, and Perfil opens from the top bar there. */
  inBottomBar: boolean;
};

/**
 * The main destinations, in the fixed order of the tabs. The rail shows all six; the bottom bar of
 * the phone keeps the first five (Perfil is a link in its top bar).
 */
export const NAVIGATION_DEFINITIONS: readonly NavigationDefinition[] = [
  { key: 'overview', label: 'Visão geral', path: '/', icon: 'home', inBottomBar: true },
  {
    key: 'transactions',
    label: 'Transações',
    path: '/transactions',
    icon: 'transfer',
    inBottomBar: true,
  },
  {
    key: 'recurrences',
    label: 'Recorrentes',
    path: '/recurrences',
    icon: 'repeat',
    inBottomBar: true,
  },
  {
    key: 'accounts',
    label: 'Contas e cartões',
    shortLabel: 'Contas',
    path: '/accounts',
    icon: 'card',
    inBottomBar: true,
  },
  {
    key: 'categories',
    label: 'Categorias',
    path: '/categories',
    icon: 'tag',
    inBottomBar: true,
  },
  { key: 'profile', label: 'Perfil', path: '/profile', icon: 'user', inBottomBar: false },
];
