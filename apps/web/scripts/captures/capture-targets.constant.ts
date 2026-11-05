// What the capture script photographs. To add a screen or a modal, add a line here.

export type CaptureTarget = {
  /** Part of the file name: `<name> <viewport> <theme>.png`. */
  name: string;
  path: string;
  /** Screens take the whole page; a modal is taken on the viewport. */
  kind: 'screen' | 'modal';
};

// The invoice page needs a card and a month. The mock ids are numbered in the order of the seed, so
// the Nubank card ("Roxinho") and the Bradesco one are always these two; the months are the ones of
// the frozen date below (22/10/2026): Nubank open in 2026-11 (it closes on the 3rd), paid in 2026-10,
// with nothing in 2026-04; Bradesco closed in 2026-10 (it closed on the 18th).
const NUBANK_CARD = '0194f3a0-0000-7000-8000-000000000026';
const BRADESCO_CARD = '0194f3a0-0000-7000-8000-000000000027';

export const SCREEN_TARGETS: CaptureTarget[] = [
  { name: 'overview', path: '/', kind: 'screen' },
  { name: 'transactions list', path: '/transactions', kind: 'screen' },
  { name: 'transactions by category', path: '/transactions?view=category', kind: 'screen' },
  { name: 'review', path: '/transactions/review', kind: 'screen' },
  { name: 'recurrences', path: '/recurrences', kind: 'screen' },
  { name: 'bills', path: '/recurrences/bills', kind: 'screen' },
  { name: 'subscriptions', path: '/recurrences/subscriptions', kind: 'screen' },
  { name: 'accounts', path: '/accounts', kind: 'screen' },
  {
    name: 'invoice open',
    path: `/cards/${NUBANK_CARD}/invoices/2026-11?from=accounts`,
    kind: 'screen',
  },
  {
    name: 'invoice closed',
    path: `/cards/${BRADESCO_CARD}/invoices/2026-10?from=accounts`,
    kind: 'screen',
  },
  {
    name: 'invoice paid',
    path: `/cards/${NUBANK_CARD}/invoices/2026-10?from=accounts`,
    kind: 'screen',
  },
  {
    name: 'invoice empty',
    path: `/cards/${NUBANK_CARD}/invoices/2026-04?from=accounts`,
    kind: 'screen',
  },
  { name: 'categories', path: '/categories', kind: 'screen' },
  { name: 'rules', path: '/categories/rules', kind: 'screen' },
  { name: 'profile', path: '/profile', kind: 'screen' },
  // `/settings` is the list on the phone and goes to Conexões on the desktop.
  { name: 'settings menu', path: '/settings', kind: 'screen' },
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
