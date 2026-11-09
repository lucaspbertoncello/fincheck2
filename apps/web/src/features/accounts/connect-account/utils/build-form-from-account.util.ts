import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { ManualAccountForm } from '#/features/accounts/connect-account/types/connect-account.type.ts';

/**
 * The form of an existing account or card, to edit it in the same modal that created it. The
 * edit never sends the balance ("Ajustar saldo" changes it): the form only carries it for the preview.
 */
export function buildFormFromAccount(account: Account.Dto): ManualAccountForm {
  const card = account.creditCard;

  return {
    type: account.type,
    name: account.name,
    institutionCode: account.type === 'wallet' ? '' : account.institutionCode,
    institutionName: account.institutionName ?? '',
    // The edit has no balance field; the preview shows the balance the account has now.
    initialBalanceCents: account.balanceCents ?? 0,
    brand: card?.brand ?? 'visa',
    last4: card?.last4 ?? '',
    closingDay: card ? String(card.closingDay) : '',
    dueDay: card ? String(card.dueDay) : '',
    limitCents: card?.limitCents ?? 0,
  };
}
