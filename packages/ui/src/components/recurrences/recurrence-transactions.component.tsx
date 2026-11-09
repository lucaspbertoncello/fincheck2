import { Money } from '#/components/money/index.ts';
import type { RecurrenceFlow } from '#/components/recurrences/recurrence-status.type.ts';
import type { RecurrenceTransaction } from '#/components/recurrences/recurrence-transaction.type.ts';

type RecurrenceTransactionsProps = {
  /** Accessible name of the list ("Transações de Salário"). */
  label: string;
  flow: RecurrenceFlow;
  transactions: readonly RecurrenceTransaction[];
  /** What the list says when it has none ("Nenhuma transação vinculada neste mês"). */
  emptyLabel: string;
};

/**
 * The transactions linked to an occurrence, under the open `RecurrenceRow`: day, description (one
 * line, cut with an ellipsis and the whole text in the `title`) and the amount at the right end,
 * in the same column as the amount of the row. Without one, a line that says so.
 */
export function RecurrenceTransactions({
  label,
  flow,
  transactions,
  emptyLabel,
}: RecurrenceTransactionsProps) {
  if (transactions.length === 0) {
    return <p className="text-label text-fg-secondary">{emptyLabel}</p>;
  }

  return (
    <ul aria-label={label} className="m-0 flex list-none flex-col gap-s8 p-0">
      {transactions.map((transaction) => (
        <li key={transaction.id} className="flex items-baseline gap-s12">
          <span className="min-w-10 shrink-0 text-label whitespace-nowrap text-fg-secondary tabular-nums">
            {transaction.dateLabel}
          </span>
          <span
            title={transaction.description}
            className="min-w-0 flex-1 truncate text-label text-fg-primary"
          >
            {transaction.description}
          </span>
          <Money
            cents={transaction.amountCents}
            sign={flow === 'income' ? 'plus' : 'minus'}
            signColumn
            weight="plain"
            tone={flow}
            className="shrink-0 text-label"
          />
        </li>
      ))}
    </ul>
  );
}
