import { Button } from '#/components/buttons/index.ts';
import { Money } from '#/components/money/index.ts';
import { TransactionDetailBox } from '#/components/transactions/row/detail-box.component.tsx';

type BankDifferenceBoxProps = {
  /** What the bank sent (shown struck through). */
  bankName: string;
  bankCents: number;
  /** What the user edited it to. */
  yourName: string;
  yourCents: number;
  /** "Valor corrigido: R$ 30,00 eram do lava-rápido." */
  note?: string;
  onRestoreOriginal: () => void;
  selectionMode?: boolean;
};

/** Edited transaction: "Banco" struck through against "Você", the reason and "Restaurar original". */
export function BankDifferenceBox({
  bankName,
  bankCents,
  yourName,
  yourCents,
  note,
  onRestoreOriginal,
  selectionMode,
}: BankDifferenceBoxProps) {
  return (
    <TransactionDetailBox selectionMode={selectionMode}>
      <dl className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-s12 gap-y-s8">
        <dt className="text-meta text-fg-secondary">Banco</dt>
        <dd className="min-w-0 text-fg-secondary line-through">{bankName}</dd>
        <dd className="text-right text-fg-secondary line-through">
          <Money cents={bankCents} sign="none" weight="plain" className="text-label" />
        </dd>
        <dt className="text-meta text-fg-secondary">Você</dt>
        <dd className="min-w-0 text-fg-primary">{yourName}</dd>
        <dd className="text-right text-fg-primary">
          <Money cents={yourCents} sign="none" weight="plain" className="text-label" />
        </dd>
      </dl>
      <div className="mt-s12 flex flex-wrap items-center gap-x-s8 border-t border-line pt-s12">
        {note ? <span className="text-fg-secondary">{note}</span> : null}
        <Button variant="tertiary" size="sm" onPress={onRestoreOriginal}>
          Restaurar original
        </Button>
      </div>
    </TransactionDetailBox>
  );
}
