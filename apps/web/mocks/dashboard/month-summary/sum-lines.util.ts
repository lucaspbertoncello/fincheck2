import type { TransactionLine } from '#mocks/transactions/transaction/build-lines.util.ts';

// Spending is positive (the sign of an expense line flipped); income stays as it is.
export function sumLines(
  lines: TransactionLine[],
  nature: 'expense' | 'income',
  fromOn: string,
  untilOn: string,
): number {
  return lines
    .filter(
      (line) =>
        line.nature === nature && line.competenceOn >= fromOn && line.competenceOn <= untilOn,
    )
    .reduce((sum, line) => sum + (nature === 'expense' ? -line.amountCents : line.amountCents), 0);
}
