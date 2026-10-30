import type { IconName } from '@fincheck/ui';

import type { TabKey } from '#/shared/types/screen.type.ts';

type NavigationDefinition = {
  key: TabKey;
  label: string;
  shortLabel?: string;
  path: string;
  icon: IconName;
};

/** The five main destinations, in the fixed order of the tabs. */
export const NAVIGATION_DEFINITIONS: readonly NavigationDefinition[] = [
  { key: 'overview', label: 'Visão geral', path: '/', icon: 'home' },
  { key: 'transactions', label: 'Transações', path: '/transactions', icon: 'transfer' },
  { key: 'recurrences', label: 'Recorrentes', path: '/recurrences', icon: 'repeat' },
  {
    key: 'accounts',
    label: 'Contas e cartões',
    shortLabel: 'Contas',
    path: '/accounts',
    icon: 'card',
  },
  { key: 'categories', label: 'Categorias', path: '/categories', icon: 'tag' },
];
