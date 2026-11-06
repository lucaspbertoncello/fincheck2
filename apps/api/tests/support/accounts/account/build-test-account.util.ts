import { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import { CreditCard } from '#/modules/accounts/domain/credit-card/credit-card.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-11-06T12:00:00.000Z';

// An account entity, manual checking by default. `card` and `bankBalanceCents` build the parts.
export function buildTestAccount(
  overrides: Partial<Account.Attributes> & { bankBalanceCents?: number; card?: boolean } = {},
): Account {
  const { bankBalanceCents, card, ...attributes } = overrides;
  const type = attributes.type ?? (card ? 'credit_card' : 'checking');

  return new Account({
    type,
    source: 'manual',
    name: 'Conta de teste',
    institutionCode: type === 'wallet' ? 'wallet' : 'nubank',
    institutionName: null,
    bankBalance: bankBalanceCents === undefined ? null : Money.fromCents(bankBalanceCents),
    bankBalanceAt: bankBalanceCents === undefined ? null : NOW,
    creditCard:
      type === 'credit_card'
        ? new CreditCard({
            brand: 'visa',
            last4: '1234',
            closingDay: 5,
            dueDay: 12,
            limit: null,
            themeId: null,
          })
        : null,
    archivedAt: null,
    createdAt: NOW,
    ...attributes,
  });
}
