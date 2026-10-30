import { Button, SplitEditor } from '@fincheck/ui';

import type { TransactionSplitterView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';

type RowSplitterProps = {
  splitter: TransactionSplitterView;
};

/** The "Dividir em duas" panel opened under a row; a transaction already split can also be put back together. */
export function RowSplitter({ splitter }: RowSplitterProps) {
  return (
    <div className="mb-s16 flex flex-col gap-s12 lg:ml-15">
      <SplitEditor
        totalCents={splitter.totalCents}
        parts={splitter.parts}
        onChange={splitter.onChange}
        categories={splitter.categories}
        createPartId={splitter.createPartId}
        maxParts={2}
        onConfirm={splitter.onConfirm}
        onCancel={splitter.onCancel}
        saving={splitter.saving}
        error={splitter.error}
      />
      {splitter.isSplit ? (
        <div>
          <Button variant="tertiary" danger onPress={splitter.onUnsplit}>
            Desfazer a divisão
          </Button>
        </div>
      ) : null}
    </div>
  );
}
