import type { ReactNode } from 'react';

/** One item inside an expanded line (a bill, an expected income). */
export type FreeBalanceItem = {
  id: string;
  label: string;
  cents: number;
  /** Small seal after the label ("pago, falta vincular"): a payment was found and not linked yet. */
  badge?: string;
};

/** A line of the equation: "A receber" (+) or "A pagar" (−). */
export type FreeBalanceLine = {
  key: 'receivable' | 'payable';
  label: string;
  /** One short line under the label ("Maxxy e mais 2"); it is cut when too long. */
  subtitle?: string;
  cents: number;
  sign: 'plus' | 'minus';
  items: FreeBalanceItem[];
};

export type FreeBalanceAccount = {
  id: string;
  name: string;
  /** "Sincronizado há 12 min". */
  subtitle: string;
  /** "warn" paints the subtitle in the attention color with an alert icon (failed sync). */
  subtitleTone?: 'normal' | 'warn';
  balanceCents: number;
  /** Bank mark (36 px circle). Without it the panel draws the initial of the name. */
  mark?: ReactNode;
};

/**
 * Ready-made data of the panel. The panel only draws it: the big number is `balanceCents` (sum of
 * the account balances) and `freeCents` closes the equation (balance + receivable − payable). The
 * texts live in `panel-labels.constant.ts`.
 */
export type FreeBalanceData = {
  /** Big number: sum of the account balances. */
  balanceCents: number;
  /** Closing line: what is left at the end of the month. */
  freeCents: number;
  /** "≈ R$ 585 por dia". */
  perDayCents: number;
  /** Days left in the month; 1 makes the per-day text say "hoje". */
  windowDays: number;
  lines: FreeBalanceLine[];
  /** Warning under the value, when the total is partial ("Livre parcial: falta o saldo do Nubank"). */
  partialNote?: string;
  accounts: FreeBalanceAccount[];
  /** "Ver mais" target (Contas e cartões, with the month). Without it the link is not drawn. */
  moreAccountsHref?: string;
};
