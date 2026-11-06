import type { Money } from '#/shared/money/money.value-object.ts';

// One part of a split transaction (RF-TRX-005): its amount carries the sign of the transaction,
// the nature is the transaction's (`lent` and `reimbursed` only come from the bills flow).
export class TransactionSplit {
  readonly id: string;
  readonly position: number;
  readonly amount: Money;
  readonly nature: TransactionSplit.Nature;
  readonly categoryId: string | null;
  readonly description: string | null;

  constructor(attr: TransactionSplit.Attributes) {
    this.id = attr.id;
    this.position = attr.position;
    this.amount = attr.amount;
    this.nature = attr.nature;
    this.categoryId = attr.categoryId;
    this.description = attr.description;
  }

  // The part of a friend, tied to a debt in `bills`: money lent or paid back, not spending.
  isOutsideSpending(): boolean {
    return this.nature === 'lent' || this.nature === 'reimbursed';
  }
}

export namespace TransactionSplit {
  export type Nature = 'expense' | 'income' | 'lent' | 'reimbursed';

  export type Attributes = {
    id: string;
    position: number;
    amount: Money;
    nature: Nature;
    categoryId: string | null;
    description: string | null;
  };
}
