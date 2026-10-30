import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { BANK_THEMES, resolveBankThemeKey, type BankThemeKey } from '@fincheck/ui';

/**
 * The visual theme of an account: the card's own variant (`themeId`, a key of the theme catalog)
 * when it is a known one, else the theme of the bank (`institutionCode`, which is the same id the
 * catalog uses), else the neutral fallback.
 */
export function resolveAccountTheme(account: Account.Dto): BankThemeKey {
  const themeId = account.creditCard?.themeId;
  if (themeId && themeId in BANK_THEMES) return themeId as BankThemeKey;
  return resolveBankThemeKey(account.institutionCode);
}
