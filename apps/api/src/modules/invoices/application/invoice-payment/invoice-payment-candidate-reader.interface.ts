import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the transactions the import detectors marked as invoice payment, the raw material of the
// "Pagamento encontrado". The owner is `transactions`.
export interface InvoicePaymentCandidateReader {
  // Debits of own accounts other than the card, and credits of the card, all marked as invoice
  // payment and entering the accounts. The debits between `from` and `to`; the credits within three
  // days around that window (the mirror of a debit at the edge).
  candidatesFor(
    input: { cardAccountId: string; from: string; to: string },
    executor?: Kysely<Database>,
  ): Promise<InvoicePaymentCandidateReader.Candidates>;
}

export namespace InvoicePaymentCandidateReader {
  export type Candidate = {
    transactionId: string;
    accountId: string;
    // With sign.
    amountCents: number;
    occurredOn: string;
    description: string;
  };

  export type Candidates = { debits: Candidate[]; credits: Candidate[] };
}
