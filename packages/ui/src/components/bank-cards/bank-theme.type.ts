import type { BankMarkId } from '#/components/bank-cards/bank-mark-art.constant.ts';

/** Key of a theme in the catalog: one per bank, two variants and the neutral fallback. */
export type BankThemeKey =
  | 'banco-do-brasil'
  | 'bradesco'
  | 'nubank'
  | 'inter'
  | 'itau'
  | 'santander'
  | 'caixa'
  | 'c6'
  | 'picpay'
  | 'mercado-pago'
  | 'nubank-ultravioleta'
  | 'bradesco-black'
  | 'fallback';

export type BankNetwork = 'mc' | 'visa' | 'elo';
export type BankChipFinish = 'gold' | 'silver' | 'graphite';
/** Corner of the bank mark: t/b = top or bottom, l/r = left or right. */
export type BankMarkCorner = 'tl' | 'tr' | 'bl' | 'br';

/** One approved card theme (vault design/system/bank themes.json). */
export type BankTheme = {
  key: BankThemeKey;
  /** Bank id in the Pluggy catalog; null for the fallback. */
  bank: string | null;
  name: string;
  reference: string;
  gradient: { angle: string; stops: readonly [string, string, string] };
  /** CSS background layers drawn over the gradient. */
  art: string;
  text: string;
  textSecondary: string;
  /** Grain opacity and gloss opacity (0 to 1). */
  noise: number;
  gloss: number;
  metal: boolean;
  chip: BankChipFinish;
  network: BankNetwork;
  markCorner: BankMarkCorner;
  /** The network goes to the top, as on the real card (only with a bottom mark). */
  networkTop: boolean;
  /** Height of the mark, in cqw. */
  markHeight: string;
  /** The official mark; null when the theme writes the bank name in text (fallback). */
  mark: { art: BankMarkId; color: string; wordmarkText: string | null } | null;
};
