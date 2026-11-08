import type { Occurrence } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import { generateId } from '#/shared/id/generate-id.util.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// One transaction that settled part of an occurrence (BR-REC-006, 008). It keeps what the
// transaction was worth when linked, without sign; what it is worth today is read from the
// transaction (`min(this amount, the amount now)`, only while the transaction counts), so ignoring
// or correcting a transaction changes the received amount at once, with no touch on the link.
export class OccurrencePayment {
  readonly id: string;
  readonly transactionId: string;
  readonly amount: Money;
  // `auto`: the import matched it; `user`: Lucas did. The automatic match never redoes a link that
  // Lucas undid.
  readonly linkedBy: Occurrence.LinkedBy;
  readonly createdAt: string;

  constructor(attr: OccurrencePayment.Attributes) {
    this.id = attr.id ?? generateId();
    this.transactionId = attr.transactionId;
    this.amount = attr.amount;
    this.linkedBy = attr.linkedBy;
    this.createdAt = attr.createdAt;
  }
}

export namespace OccurrencePayment {
  export type Attributes = {
    id?: string;
    transactionId: string;
    amount: Money;
    linkedBy: Occurrence.LinkedBy;
    createdAt: string;
  };
}
