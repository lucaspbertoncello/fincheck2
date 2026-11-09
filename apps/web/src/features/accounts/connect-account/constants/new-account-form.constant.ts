import type { ManualAccountForm } from '#/features/accounts/connect-account/types/connect-account.type.ts';

/** The manual form of a new account: a checking account, nothing typed. */
export const EMPTY_ACCOUNT_FORM: ManualAccountForm = {
  type: 'checking',
  name: '',
  institutionCode: '',
  institutionName: '',
  initialBalanceCents: 0,
  brand: 'visa',
  last4: '',
  closingDay: '',
  dueDay: '',
  limitCents: 0,
};

/** The manual form of a new credit card ("Adicionar cartão de crédito"): the same, as a card. */
export const NEW_CARD_FORM: ManualAccountForm = { ...EMPTY_ACCOUNT_FORM, type: 'credit_card' };
