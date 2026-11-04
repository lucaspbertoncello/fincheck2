// What the capture script photographs. To add a screen or a modal, add a line here.

export type CaptureTarget = {
  /** Part of the file name: `<name> <viewport> <theme>.png`. */
  name: string;
  path: string;
  /**
   * Screens take the whole page; a modal is taken on the viewport. A section is one part of a
   * long page (the four of Configurações): the page scrolls to `#<sectionId>` and the viewport is
   * taken, so each section has its own picture with its menu item active.
   */
  kind: 'screen' | 'modal' | 'section';
  /** Element id the section capture waits for (only for `kind: 'section'`). */
  sectionId?: string;
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
  {
    name: 'settings profile',
    path: '/settings#profile',
    kind: 'section',
    sectionId: 'settings-profile',
  },
  {
    name: 'settings connections',
    path: '/settings#connections',
    kind: 'section',
    sectionId: 'settings-connections',
  },
  {
    name: 'settings backup',
    path: '/settings#backup',
    kind: 'section',
    sectionId: 'settings-backup',
  },
  {
    name: 'settings appearance',
    path: '/settings#appearance',
    kind: 'section',
    sectionId: 'settings-appearance',
  },
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
