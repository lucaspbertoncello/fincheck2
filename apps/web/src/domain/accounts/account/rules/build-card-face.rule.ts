import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { BankThemeKey } from '@fincheck/ui';

import { resolveAccountTheme } from '#/domain/accounts/account/rules/resolve-account-theme.rule.ts';

/** What the bank card draws: the same on Contas e cartões and at the top of the invoice page. */
export type CardFace = {
  theme: BankThemeKey;
  nickname: string;
  last4: string;
  /** "Vence dia 06". */
  dueLabel: string;
  bankName?: string;
};

/** The face of a credit card account, so every screen draws the same card. */
export function buildCardFace(card: Account.Dto): CardFace {
  const details = card.creditCard;

  return {
    theme: resolveAccountTheme(card),
    nickname: card.name,
    last4: details?.last4 ?? '',
    dueLabel: `Vence dia ${String(details?.dueDay ?? 0).padStart(2, '0')}`,
    bankName: card.institutionName ?? undefined,
  };
}
