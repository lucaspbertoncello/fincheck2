import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';

/** How the account gets in: a bank through the Meu Pluggy, or typed by hand. */
export type ConnectMode = 'pluggy' | 'manual';

/** The manual account form as the person types it (days stay text until they are validated). */
export type ManualAccountForm = {
  type: Account.Type;
  name: string;
  institutionCode: Institution.Code | '';
  institutionName: string;
  initialBalanceCents: number;
  brand: CreditCard.Brand;
  last4: string;
  closingDay: string;
  dueDay: string;
  limitCents: number;
};

/** Error messages by field, keyed like the form ("name", "creditCard.closingDay"). */
export type FormErrors = Partial<Record<string, string>>;
