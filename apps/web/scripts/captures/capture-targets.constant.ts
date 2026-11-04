// What the capture script photographs. To add a screen or a modal, add a line here.

export type CaptureTarget = {
  /** Part of the file name: `<name> <viewport> <theme>.png`. */
  name: string;
  path: string;
  /** Screens take the whole page; a modal is taken on the viewport. */
  kind: 'screen' | 'modal';
};

export const SCREEN_TARGETS: CaptureTarget[] = [
  { name: 'overview', path: '/', kind: 'screen' },
  { name: 'transactions list', path: '/transactions', kind: 'screen' },
  { name: 'transactions by category', path: '/transactions?view=category', kind: 'screen' },
  { name: 'review', path: '/transactions/review', kind: 'screen' },
  { name: 'recurrences', path: '/recurrences', kind: 'screen' },
  { name: 'bills', path: '/recurrences/bills', kind: 'screen' },
  { name: 'accounts', path: '/accounts', kind: 'screen' },
  { name: 'categories', path: '/categories', kind: 'screen' },
  { name: 'rules', path: '/categories/rules', kind: 'screen' },
  // `/settings` is the list on the phone and goes to Perfil on the desktop.
  { name: 'settings menu', path: '/settings', kind: 'screen' },
  { name: 'settings profile', path: '/settings/profile', kind: 'screen' },
  { name: 'settings connections', path: '/settings/connections', kind: 'screen' },
  { name: 'settings backup', path: '/settings/backup', kind: 'screen' },
  { name: 'settings appearance', path: '/settings/appearance', kind: 'screen' },
];

export const MODAL_TARGETS: CaptureTarget[] = [
  { name: 'new transaction modal', path: '/transactions?new=transaction', kind: 'modal' },
  { name: 'new installment modal', path: '/transactions?new=installment', kind: 'modal' },
  { name: 'new recurrence modal', path: '/recurrences?new=recurrence', kind: 'modal' },
  { name: 'new bill modal', path: '/recurrences/bills?new=bill', kind: 'modal' },
  { name: 'new debt modal', path: '/recurrences/bills?new=debt', kind: 'modal' },
  { name: 'connect account modal', path: '/accounts?new=account', kind: 'modal' },
  { name: 'new category modal', path: '/categories?new=category', kind: 'modal' },
  { name: 'new rule modal', path: '/categories/rules?new=rule', kind: 'modal' },
];

export const CAPTURE_TARGETS: CaptureTarget[] = [...SCREEN_TARGETS, ...MODAL_TARGETS];

export const CAPTURE_VIEWPORTS = [
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-375', width: 375, height: 812 },
];

export const CAPTURE_THEMES = ['light', 'dark'] as const;

/** Thursday 2026-10-22, 12:00 in America/Sao_Paulo (UTC-3): the same "today" as the tests. */
export const CAPTURE_NOW_ISO = '2026-10-22T15:00:00.000Z';
