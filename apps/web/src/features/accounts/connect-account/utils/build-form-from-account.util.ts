import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { ManualAccountForm } from '#/features/accounts/connect-account/types/connect-account.type.ts';

/** The form of an existing account or card, to edit it in the same modal that created it. */
export function buildFormFromAccount(account: Account.Dto): ManualAccountForm {
  const card = account.creditCard;

  return {
    type: account.type,
    name: account.name,
    institutionCode: account.type === 'wallet' ? '' : account.institutionCode,
    institutionName: account.institutionName ?? '',
    initialBalanceCents: 0,
    brand: card?.brand ?? 'visa',
    last4: card?.last4 ?? '',
    closingDay: card ? String(card.closingDay) : '',
    dueDay: card ? String(card.dueDay) : '',
    limitCents: card?.limitCents ?? 0,
  };
}
