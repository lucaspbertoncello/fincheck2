import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import { TransactionDetailBox } from '#/components/transactions/row/detail-box.component.tsx';

type BankChangedNoticeProps = {
  /** Value the bank had before. */
  previousCents: number;
  /** Value the bank has now. */
  currentCents: number;
  onUseBank: () => void;
  onKeepMine: () => void;
  onShowDifference: () => void;
  selectionMode?: boolean;
};

/** Amber box: the bank changed the amount after the user edited it; which one wins (BR-TRX-005). */
export function BankChangedNotice({
  previousCents,
  currentCents,
  onUseBank,
  onKeepMine,
  onShowDifference,
  selectionMode,
}: BankChangedNoticeProps) {
  return (
    <TransactionDetailBox tone="warn" selectionMode={selectionMode}>
      <p className="flex items-start gap-s12">
        <Icon name="warning" size="base" className="text-caution" />
        <span>
          O banco mudou o valor de{' '}
          <Money cents={previousCents} sign="none" weight="plain" currency="inline" /> para{' '}
          <Money cents={currentCents} sign="none" weight="plain" currency="inline" /> depois da sua
          edição. Qual vale?
        </span>
      </p>
      <div className="mt-s8 flex flex-col gap-s8 lg:flex-row lg:flex-wrap lg:items-center">
        <Button variant="primary" size="sm" onPress={onUseBank}>
          Usar o valor do banco
        </Button>
        <Button variant="secondary" size="sm" onPress={onKeepMine}>
          Manter o meu
        </Button>
        <Button variant="secondary" size="sm" onPress={onShowDifference}>
          Ver diferença
        </Button>
      </div>
    </TransactionDetailBox>
  );
}
