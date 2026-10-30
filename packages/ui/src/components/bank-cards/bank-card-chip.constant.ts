import type { BankChipFinish } from '#/components/bank-cards/bank-theme.type.ts';

/** The three EMV chip finishes: gradient stops, contact lines and border (bank themes page). */
export const BANK_CHIP_COLORS = {
  gold: {
    from: 'oklch(0.92 0.07 88)',
    mid: 'oklch(0.76 0.09 80)',
    to: 'oklch(0.86 0.07 85)',
    line: 'oklch(0.55 0.06 80 / .55)',
    edge: 'oklch(0.4 0.05 70 / .35)',
  },
  silver: {
    from: 'oklch(0.95 0.004 250)',
    mid: 'oklch(0.76 0.008 250)',
    to: 'oklch(0.88 0.006 250)',
    line: 'oklch(0.5 0.01 250 / .5)',
    edge: 'oklch(0.35 0.01 250 / .35)',
  },
  graphite: {
    from: 'oklch(0.62 0.004 250)',
    mid: 'oklch(0.42 0.006 250)',
    to: 'oklch(0.55 0.005 250)',
    line: 'oklch(0.25 0.01 250 / .6)',
    edge: 'oklch(0.15 0.01 250 / .5)',
  },
} as const satisfies Record<BankChipFinish, Record<string, string>>;
