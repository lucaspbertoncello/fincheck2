import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// A transaction pays one thing only (an invoice, an occurrence of a recurrence or a bill), and each
// owner knows its own link. This puts the readers together: it asks them all and answers the
// transactions any of them found tied.
export function composeLinkedTransactionReaders(
  ...readers: {
    findLinkedTransactionIds(
      transactionIds: string[],
      executor?: Kysely<Database>,
    ): Promise<Set<string>>;
  }[]
) {
  return {
    async findLinkedTransactionIds(transactionIds: string[], executor?: Kysely<Database>) {
      const answers = await Promise.all(
        readers.map((reader) => reader.findLinkedTransactionIds(transactionIds, executor)),
      );

      return new Set(answers.flatMap((answer) => [...answer]));
    },
  };
}
