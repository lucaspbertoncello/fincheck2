import type { CreditCard as CreditCardContract } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';

import { Money } from '#/shared/money/money.value-object.ts';

// What only a credit card has (1:1 with the account, same aggregate). Only the non-sensitive data
// (BR-ACC-005): brand, the last 4 digits, closing and due day, limit and theme. Immutable: a change
// returns a new card. The closing and due day only apply to invoices that are not born yet.
export class CreditCard {
  readonly brand: CreditCardContract.Brand;
  readonly last4: string | null;
  readonly closingDay: number;
  readonly dueDay: number;
  readonly limit: Money | null;
  readonly themeId: string | null;

  constructor(attr: CreditCard.Attributes) {
    this.brand = attr.brand;
    this.last4 = attr.last4;
    this.closingDay = attr.closingDay;
    this.dueDay = attr.dueDay;
    this.limit = attr.limit;
    this.themeId = attr.themeId;
  }

  static fromRequest(request: CreditCardContract.CreateRequest): CreditCard {
    return new CreditCard({
      brand: request.brand,
      last4: request.last4 ?? null,
      closingDay: request.closingDay,
      dueDay: request.dueDay,
      limit: request.limitCents === undefined ? null : Money.fromCents(request.limitCents),
      themeId: request.themeId ?? null,
    });
  }

  // Partial change: a missing field stays, `null` clears `last4`, the limit and the theme.
  change(patch: CreditCardContract.UpdateRequest): CreditCard {
    return new CreditCard({
      brand: patch.brand ?? this.brand,
      last4: patch.last4 === undefined ? this.last4 : patch.last4,
      closingDay: patch.closingDay ?? this.closingDay,
      dueDay: patch.dueDay ?? this.dueDay,
      limit:
        patch.limitCents === undefined
          ? this.limit
          : patch.limitCents === null
            ? null
            : Money.fromCents(patch.limitCents),
      themeId: patch.themeId === undefined ? this.themeId : patch.themeId,
    });
  }
}

export namespace CreditCard {
  export type Attributes = {
    brand: CreditCardContract.Brand;
    last4: string | null;
    closingDay: number;
    dueDay: number;
    limit: Money | null;
    themeId: string | null;
  };
}
