import { BANK_THEMES } from '#/components/bank-cards/bank-themes.constant.ts';
import type { BankThemeKey } from '#/components/bank-cards/bank-theme.type.ts';

/** The theme of a bank id ("nubank"); any bank outside the catalog gets the neutral fallback. */
export function resolveBankThemeKey(bank: string | null | undefined): BankThemeKey {
  const match = Object.values(BANK_THEMES).find(
    (theme) => theme.bank !== null && theme.bank === bank && theme.key === bank,
  );
  return match ? match.key : 'fallback';
}
