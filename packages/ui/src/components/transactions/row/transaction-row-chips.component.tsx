import { Chip } from '#/components/chips/index.ts';
import { Money } from '#/components/money/index.ts';
import type { TransactionRowData } from '#/components/transactions/row/transaction-row.type.ts';

type TransactionRowChipsProps = {
  transaction: TransactionRowData;
};

/** The chips under a row (components.md 6, "Variantes de metadado"), in a fixed order. */
export function TransactionRowChips({ transaction }: TransactionRowChipsProps) {
  const { installment, splitParts, debtPaidCents, debtPerson, tags } = transaction;

  return (
    <>
      {transaction.pending ? (
        <Chip tone="warn" icon="clock">
          Pendente
        </Chip>
      ) : null}
      {transaction.toReview ? <Chip tone="dashed">Para revisar</Chip> : null}
      {transaction.edited ? (
        <Chip tone="ok" icon="edit">
          Editada
        </Chip>
      ) : null}
      {transaction.bankChanged ? (
        <Chip tone="warn" icon="warning">
          Banco alterou o original
        </Chip>
      ) : null}
      {splitParts && splitParts > 1 ? <Chip icon="split">Dividida em {splitParts}</Chip> : null}
      {installment ? (
        <Chip>
          Parcela {installment.number} de {installment.total}
        </Chip>
      ) : null}
      {transaction.outOfAccount ? <Chip tone="ok">Fora da conta</Chip> : null}
      {transaction.ignored ? <Chip icon="eye-off">Ignorada</Chip> : null}
      {debtPaidCents !== undefined ? (
        <Chip tone="ok" icon="hand-money">
          Abateu <Money cents={debtPaidCents} sign="none" weight="plain" className="text-meta" /> da
          dívida{debtPerson ? ` com ${debtPerson}` : ''}
        </Chip>
      ) : null}
      {tags?.map((tag) => (
        <Chip key={tag} tone="tag" icon="hash">
          {tag}
        </Chip>
      ))}
    </>
  );
}
