import type { MockState } from '#mocks/state/mock-state.type.ts';
import { competenceOn } from '#mocks/transactions/transaction/competence-on.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

// One line of spending or income: a whole transaction, or one part of a split one.
export interface TransactionLine {
  transactionId: string;
  description: string;
  occurredOn: string;
  competenceOn: string;
  // With the transaction's sign (expense negative).
  amountCents: number;
  nature: 'expense' | 'income';
  categoryId: string | null;
}

// The lines the month is built from: only `expense` and `income` count; a split transaction counts
// by its parts, an installment by the month of its invoice.
export function buildLines(database: MockState.Database): TransactionLine[] {
  const lines: TransactionLine[] = [];

  for (const tx of database.transactions) {
    if (!countsInAccounts(tx)) continue;
    const date = competenceOn(database, tx);

    if (tx.splits.length > 0) {
      for (const part of tx.splits) {
        if (part.nature !== 'expense' && part.nature !== 'income') continue;
        lines.push({
          transactionId: tx.id,
          description: part.description ?? tx.description,
          occurredOn: tx.occurredOn,
          competenceOn: date,
          amountCents: part.amountCents,
          nature: part.nature,
          categoryId: part.categoryId,
        });
      }
    } else if (tx.nature === 'expense' || tx.nature === 'income') {
      lines.push({
        transactionId: tx.id,
        description: tx.description,
        occurredOn: tx.occurredOn,
        competenceOn: date,
        amountCents: tx.amountCents,
        nature: tx.nature,
        categoryId: tx.categoryId,
      });
    }
  }

  return lines;
}
