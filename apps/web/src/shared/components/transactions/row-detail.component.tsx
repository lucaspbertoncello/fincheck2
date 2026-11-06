import {
  BankChangedNotice,
  BankDifferenceBox,
  Button,
  CategorySuggestion,
  Collapse,
  Icon,
  TransactionDetailBox,
} from '@fincheck/ui';
import { useState } from 'react';

import type {
  RowDetailView,
  TransactionRowHandlers,
} from '#/shared/types/transactions/transaction-list-view.type.ts';

type RowDetailProps = {
  transactionId: string;
  detail: RowDetailView;
  selectionMode: boolean;
  handlers: TransactionRowHandlers;
};

/** One box under a row: the bank's original, "banco mudou", "banco removeu" or the category suggestion. */
export function RowDetail({ transactionId, detail, selectionMode, handlers }: RowDetailProps) {
  const [showDifference, setShowDifference] = useState(false);

  if (detail.kind === 'edited') {
    return (
      <BankDifferenceBox
        bankName={detail.bankName}
        bankCents={detail.bankCents}
        yourName={detail.yourName}
        yourCents={detail.yourCents}
        note={detail.note}
        onRestoreOriginal={() => handlers.onRestoreOriginal(transactionId)}
        selectionMode={selectionMode}
      />
    );
  }

  if (detail.kind === 'suggestion') {
    return (
      <CategorySuggestion
        suggestion={detail.category}
        onAccept={(categoryId) => handlers.onAcceptSuggestion(transactionId, categoryId)}
        onChooseOther={() => handlers.onChooseOtherCategory(transactionId)}
        selectionMode={selectionMode}
      />
    );
  }

  if (detail.kind === 'bank-removed') {
    return (
      <TransactionDetailBox tone="warn" selectionMode={selectionMode}>
        <p className="flex items-start gap-s12">
          <Icon name="warning" size="base" className="text-caution" />
          <span>O banco deixou de mandar esta transação depois da sua edição. Ela fica?</span>
        </p>
        <div className="mt-s8 flex flex-col gap-s8 lg:flex-row lg:items-center">
          <Button
            variant="secondary"
            size="sm"
            onPress={() => handlers.onResolveBankChange(transactionId, 'mine')}
          >
            Manter a minha
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => handlers.onResolveBankChange(transactionId, 'bank')}
          >
            Aceitar a remoção
          </Button>
        </div>
      </TransactionDetailBox>
    );
  }

  const difference = (
    <Collapse isOpen={showDifference}>
      <BankDifferenceBox
        bankName={detail.bankName}
        bankCents={detail.bankCents}
        yourName={detail.yourName}
        yourCents={detail.yourCents}
        onRestoreOriginal={() => handlers.onRestoreOriginal(transactionId)}
        selectionMode={selectionMode}
      />
    </Collapse>
  );

  if (detail.amount) {
    return (
      <>
        <BankChangedNotice
          previousCents={Math.abs(detail.amount.before)}
          currentCents={Math.abs(detail.amount.after)}
          onUseBank={() => handlers.onResolveBankChange(transactionId, 'bank')}
          onKeepMine={() => handlers.onResolveBankChange(transactionId, 'mine')}
          onShowDifference={() => setShowDifference((current) => !current)}
          selectionMode={selectionMode}
        />
        {difference}
      </>
    );
  }

  return (
    <>
      <TransactionDetailBox tone="warn" selectionMode={selectionMode}>
        <p className="flex items-start gap-s12">
          <Icon name="warning" size="base" className="text-caution" />
          <span>{detail.text} Qual vale?</span>
        </p>
        <div className="mt-s8 flex flex-col gap-s8 lg:flex-row lg:flex-wrap lg:items-center">
          <Button
            variant="secondary"
            size="sm"
            onPress={() => handlers.onResolveBankChange(transactionId, 'bank')}
          >
            Usar o do banco
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => handlers.onResolveBankChange(transactionId, 'mine')}
          >
            Manter o meu
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            aria-expanded={showDifference}
            onPress={() => setShowDifference((current) => !current)}
          >
            Ver diferença
          </Button>
        </div>
      </TransactionDetailBox>
      {difference}
    </>
  );
}
