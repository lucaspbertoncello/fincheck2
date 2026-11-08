import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';

// Which transactions already settle an occurrence. `invoices` asks it through its
// `LinkedTransactionReader`, which this class satisfies: a debit tied to an occurrence is not the
// payment found of an invoice and cannot be linked to one.
export class FindOccurrenceLinkedTransactionsQuery {
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;

  constructor(occurrences: OccurrenceRepository<Kysely<Database>>) {
    this.occurrences = occurrences;
  }

  findLinkedTransactionIds(
    transactionIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Set<string>> {
    return this.occurrences.findLinkedTransactionIds(transactionIds, executor);
  }
}
