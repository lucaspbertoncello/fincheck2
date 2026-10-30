import { Button, InlineNotice, TransactionEditPanel } from '@fincheck/ui';

import type { TransactionEditorView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';

type RowEditorProps = {
  editor: TransactionEditorView;
};

/** The edit panel opened under a row (R6: nature and the other leg of a transfer), with delete for a manual one. */
export function RowEditor({ editor }: RowEditorProps) {
  return (
    <div className="mb-s16 flex flex-col gap-s12 lg:ml-15">
      <TransactionEditPanel
        values={editor.values}
        onChange={editor.onChange}
        categories={editor.categories}
        counterparts={editor.counterparts}
        errors={editor.errors}
        original={editor.original}
        onRestoreOriginal={editor.onRestoreOriginal}
        onSave={editor.onSave}
        onCancel={editor.onCancel}
        saving={editor.saving}
      />
      {editor.formError ? <InlineNotice>{editor.formError}</InlineNotice> : null}
      {editor.canDelete ? (
        <div>
          <Button variant="tertiary" danger icon="trash" onPress={editor.onDelete}>
            Excluir transação
          </Button>
        </div>
      ) : null}
    </div>
  );
}
