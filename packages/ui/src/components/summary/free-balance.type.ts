import type { ReactNode } from 'react';

/** One item inside an expanded composition line (a bank account, a bill, an expected income). */
export type FreeBalanceItem = {
  id: string;
  label: string;
  cents: number;
};

/** A line of the composition: "Saldo nas contas" (+), "A receber" (+), "A pagar" (−). */
export type FreeBalanceLine = {
  key: 'balance' | 'receivable' | 'payable';
  label: string;
  /** "R$ 4.200,00 ainda esperado (Maxxy)". At most two lines. */
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

export type FreeBalanceInvoice = {
  id: string;
  name: string;
  /** "Aberta, vence 06/11". */
  subtitle: string;
  amountCents: number;
  /** Mini card (40 × 26). Without it the panel draws the default gradient card. */
  mark?: ReactNode;
};

/** Ready-made data of the "Livre até o fim do mês" panel. The panel only draws it. */
export type FreeBalanceData = {
  freeCents: number;
  /** "≈ R$ 585 por dia nos próximos 10 dias". */
  perDayCents: number;
  /** Days in the strip ("10 dias até o fim do mês") and how many are already behind. */
  windowDays: number;
  elapsedDays: number;
  /** "dado do Bradesco de ontem", when a bank failed to sync. */
  staleNote?: string;
  lines: FreeBalanceLine[];
  review?: { count: number; subtitle: string; href: string };
  accounts: FreeBalanceAccount[];
  invoices: FreeBalanceInvoice[];
};
