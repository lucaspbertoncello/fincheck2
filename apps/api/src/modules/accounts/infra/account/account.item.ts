import type { Insertable, Selectable } from 'kysely';

import type { AccountsTable } from '#/database/tables/accounts/accounts-table.type.ts';
import type { CreditCardsTable } from '#/database/tables/accounts/credit-cards-table.type.ts';
import { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import { CreditCard } from '#/modules/accounts/domain/credit-card/credit-card.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The aggregate as rows: one of `accounts` and, for a card, one of `credit_cards`. The row of the
// card has the columns of the card; the read joins both, so they come nullable.
export class AccountItem {
  static fromEntity(account: Account): AccountItem.Rows {
    return {
      account: {
        id: account.id,
        type: account.type,
        source: account.source,
        name: account.name,
        institution_code: account.institutionCode,
        institution_name: account.institutionName,
        bank_balance_cents: account.bankBalance?.cents ?? null,
        bank_balance_at: account.bankBalanceAt,
        archived_at: account.archivedAt,
        created_at: account.createdAt,
        updated_at: account.updatedAt,
      },
      creditCard: account.creditCard
        ? {
            account_id: account.id,
            brand: account.creditCard.brand,
            last4: account.creditCard.last4,
            closing_day: account.creditCard.closingDay,
            due_day: account.creditCard.dueDay,
            limit_cents: account.creditCard.limit?.cents ?? null,
            theme_id: account.creditCard.themeId,
          }
        : null,
    };
  }

  static toDomain(row: AccountItem.JoinedRow): Account {
    return new Account({
      id: row.id,
      type: row.type,
      source: row.source,
      name: row.name,
      // The column is free text in the database; the application writes only the closed list.
      institutionCode: row.institution_code as Account.Attributes['institutionCode'],
      institutionName: row.institution_name,
      bankBalance: row.bank_balance_cents === null ? null : Money.fromCents(row.bank_balance_cents),
      bankBalanceAt: row.bank_balance_at,
      creditCard:
        row.card_brand === null || row.card_closing_day === null || row.card_due_day === null
          ? null
          : new CreditCard({
              brand: row.card_brand,
              last4: row.card_last4,
              closingDay: row.card_closing_day,
              dueDay: row.card_due_day,
              limit: row.card_limit_cents === null ? null : Money.fromCents(row.card_limit_cents),
              themeId: row.card_theme_id,
            }),
      archivedAt: row.archived_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

export namespace AccountItem {
  export type Rows = {
    account: Insertable<AccountsTable>;
    creditCard: Insertable<CreditCardsTable> | null;
  };

  // `accounts` joined with `credit_cards`: the card columns are named `card_*`.
  export type JoinedRow = Selectable<AccountsTable> & {
    card_brand: CreditCardsTable['brand'] | null;
    card_last4: string | null;
    card_closing_day: number | null;
    card_due_day: number | null;
    card_limit_cents: number | null;
    card_theme_id: string | null;
  };
}
