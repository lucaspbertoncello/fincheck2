import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';

// The `links` of a transaction come from three owners (`recurrences`, `bills`, `invoices`), each of
// which only knows its own link. This puts the readers together: it asks them all and, for each
// transaction, keeps the link each one found (a field one reader leaves null does not erase the
// one another found). A transaction no reader knows is absent from the map.
export function composeTransactionLinksReaders(
  ...readers: TransactionLinksReader[]
): TransactionLinksReader {
  return {
    async linksOf(transactionIds: string[], executor?: Kysely<Database>) {
      const answers = await Promise.all(
        readers.map((reader) => reader.linksOf(transactionIds, executor)),
      );
      const merged = new Map<string, Transaction.LinksDto>();
      for (const answer of answers) {
        for (const [transactionId, links] of answer) {
          const kept = merged.get(transactionId);
          merged.set(transactionId, {
            occurrence: links.occurrence ?? kept?.occurrence ?? null,
            bill: links.bill ?? kept?.bill ?? null,
            invoicePayment: links.invoicePayment ?? kept?.invoicePayment ?? null,
          });
        }
      }

      return merged;
    },
  };
}
