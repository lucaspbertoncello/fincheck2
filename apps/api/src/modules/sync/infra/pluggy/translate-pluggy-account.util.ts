import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { convertAmountToCents } from '#/modules/sync/infra/pluggy/convert-amount-to-cents.util.ts';
import { isForeignCurrency } from '#/modules/sync/infra/pluggy/is-foreign-currency.util.ts';
import type { PluggyAccount } from '#/modules/sync/infra/pluggy/pluggy-account.type.ts';
import { translatePluggyCardBrand } from '#/modules/sync/infra/pluggy/translate-pluggy-card-brand.util.ts';
import { translatePluggyDate } from '#/modules/sync/infra/pluggy/translate-pluggy-date.util.ts';

const TYPE_BY_SUBTYPE = {
  CHECKING_ACCOUNT: 'checking',
  SAVINGS_ACCOUNT: 'savings',
  CREDIT_CARD: 'credit_card',
} as const;

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const dayOf = (value: unknown): number | null => {
  const date = translatePluggyDate(value);

  return date === null ? null : Number(date.slice(8, 10));
};

// The account of the port; null for what Fincheck does not keep (investment, loan...).
export function translatePluggyAccount(
  response: PluggyAccount.Response,
): BankDataProvider.Account | null {
  const type = TYPE_BY_SUBTYPE[response.subtype as keyof typeof TYPE_BY_SUBTYPE];

  if (!type) return null;
  // An account in another currency is not kept: its balance would be read as reais.
  if (isForeignCurrency(response.currencyCode)) return null;
  if (typeof response.id !== 'string' || response.id === '') {
    throw new TypeError('The account has no id');
  }
  const digits = asText(response.number).replace(/\D/g, '');
  const credit = response.creditData;

  return {
    id: response.id,
    name: asText(response.name) || asText(response.marketingName) || 'Sem nome',
    type,
    // The bank of the connection holds; the gateway fills it only for the MeuPluggy.
    institution: null,
    // As it came: the card shows the amount used and the port keeps it that way.
    balanceCents:
      typeof response.balance === 'number' ? convertAmountToCents(response.balance) : null,
    numberHint: digits.length >= 4 ? digits.slice(-4) : null,
    card:
      type === 'credit_card'
        ? {
            brand: translatePluggyCardBrand(credit?.brand),
            // The Pluggy has no field for the closing day: `balanceCloseDate` is the day the balance
            // was calculated. Null, so the core uses the default (7 days before the due day).
            closingDay: null,
            dueDay: dayOf(credit?.balanceDueDate),
            limitCents:
              typeof credit?.creditLimit === 'number'
                ? convertAmountToCents(credit.creditLimit)
                : null,
          }
        : null,
  };
}
