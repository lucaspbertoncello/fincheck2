import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// The days around the window in which the credit mirroring a debit may fall.
const MIRROR_DAYS = 3;

// The raw material of the "Pagamento encontrado" of an invoice: the debits of own accounts (other
// than the card) and the credits of the card that the import detectors marked as invoice payment,
// all entering the accounts. The choice among them is the rule of `invoices`. A debit is told by
// its meio: on a card the method is always `credit` (N7), so a debit on any other account is not.
// `invoices` asks it through its `InvoicePaymentCandidateReader`, which this class satisfies.
export class ListInvoicePaymentCandidatesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async candidatesFor(
    input: { cardAccountId: string; from: string; to: string },
    executor: Kysely<Database> = this.db,
  ): Promise<{
    debits: ListInvoicePaymentCandidatesQuery.Candidate[];
    credits: ListInvoicePaymentCandidatesQuery.Candidate[];
  }> {
    const [debits, credits] = await Promise.all([
      executor
        .selectFrom('transactions as t')
        .select(['t.id', 't.account_id', 't.amount_cents', 't.occurred_on', 't.description'])
        .where('t.nature', '=', 'invoice_payment')
        .where('t.amount_cents', '<', 0)
        .where('t.account_id', '!=', input.cardAccountId)
        .where('t.method', '!=', 'credit')
        .where('t.occurred_on', '>=', input.from)
        .where('t.occurred_on', '<=', input.to)
        .where(entersAccountsSql('t'))
        .execute(),
      executor
        .selectFrom('transactions as t')
        .select(['t.id', 't.account_id', 't.amount_cents', 't.occurred_on', 't.description'])
        .where('t.nature', '=', 'invoice_payment')
        .where('t.amount_cents', '>', 0)
        .where('t.account_id', '=', input.cardAccountId)
        .where('t.occurred_on', '>=', BusinessDate.of(input.from).addDays(-MIRROR_DAYS).value)
        .where('t.occurred_on', '<=', BusinessDate.of(input.to).addDays(MIRROR_DAYS).value)
        .where(entersAccountsSql('t'))
        .execute(),
    ]);
    const toCandidate = (row: (typeof debits)[number]) => ({
      transactionId: row.id,
      accountId: row.account_id,
      amountCents: row.amount_cents,
      occurredOn: row.occurred_on,
      description: row.description,
    });

    return { debits: debits.map(toCandidate), credits: credits.map(toCandidate) };
  }
}

export namespace ListInvoicePaymentCandidatesQuery {
  export type Candidate = {
    transactionId: string;
    accountId: string;
    amountCents: number;
    occurredOn: string;
    description: string;
  };
}
