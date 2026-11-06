import {
  AmountField,
  DateQuickField,
  FieldSet,
  FineNote,
  FormModal,
  FormModalMore,
  FormModalSplit,
  OriginalFromBankNote,
  SegmentedControl,
  SelectField,
  TagEditor,
  TextField,
  type AmountKind,
  type TransactionEditValues,
  type TransactionNature,
} from '@fincheck/ui';

import { CategoryChipsField } from '#/features/transactions/components/category-chips-field.component.tsx';
import type { TransactionEditorView } from '#/shared/types/transactions/transaction-list-view.type.ts';

type TransactionEditModalProps = {
  editor: TransactionEditorView;
};

const NATURES = [
  { key: 'expense', label: 'Despesa' },
  { key: 'income', label: 'Receita' },
  { key: 'transfer', label: 'Transferência' },
];
const OUT_OF_ACCOUNT = { key: 'out_of_account', label: 'Fora da conta' };

function kindOf(nature: TransactionNature, direction: AmountKind): AmountKind {
  return nature === 'expense' || nature === 'income' ? nature : direction;
}

/**
 * "Editar transação": the same modal as "Nova transação" (form-modal pattern), with the values of
 * the transaction. Nature (Despesa | Receita | Transferência, R6) is a full-width row above the two columns, so four options still fit on one line; a
 * transfer asks for its other leg instead of a category. Tags wait in "Mais opções", the bank's
 * original shows when the transaction was edited, and "Excluir" (manual ones only) is at the left
 * of the footer. Creating and editing differ only in the words and the values.
 */
export function TransactionEditModal({ editor }: TransactionEditModalProps) {
  const { values, errors } = editor;
  const patch = (changes: Partial<TransactionEditValues>) =>
    editor.onChange({ ...values, ...changes });
  const isTransfer = values.nature === 'transfer';
  const natures = values.nature === 'out_of_account' ? [...NATURES, OUT_OF_ACCOUNT] : NATURES;

  return (
    <FormModal
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) editor.onCancel();
      }}
      title="Editar transação"
      description={editor.description}
      submitLabel="Salvar"
      submittingLabel="Salvando..."
      isSubmitting={editor.saving}
      error={editor.formError}
      destructive={editor.canDelete ? { label: 'Excluir', onPress: editor.onDelete } : undefined}
      onSubmit={editor.onSave}
    >
      <SegmentedControl
        label="Tipo da transação"
        options={natures}
        value={values.nature}
        onChange={(nature) => patch({ nature: nature as TransactionNature })}
      />
      <FormModalSplit
        aside={
          <>
            <AmountField
              cents={values.amountCents}
              onChange={(amountCents) => patch({ amountCents })}
              kind={kindOf(values.nature, editor.direction)}
              error={errors.amount}
            />
            <TextField
              label="Descrição"
              value={values.description}
              onChange={(description) => patch({ description })}
              error={errors.description}
              autoComplete="off"
              maxLength={200}
            />
          </>
        }
      >
        {isTransfer ? (
          editor.counterparts.length > 0 ? (
            <SelectField
              label="Outra perna da transferência"
              options={editor.counterparts}
              value={values.counterpartId}
              onChange={(counterpartId) => patch({ counterpartId })}
              error={errors.counterpart}
            />
          ) : (
            <FieldSet label="Outra perna da transferência" error={errors.counterpart}>
              <FineNote icon="transfer">
                Nenhuma transação de outra conta combina com esta. Quando o outro lado chegar do
                banco, ele aparece aqui.
              </FineNote>
            </FieldSet>
          )
        ) : (
          <CategoryChipsField
            categories={editor.categories}
            value={values.categoryId}
            onChange={(categoryId) => patch({ categoryId })}
            error={errors.category}
          />
        )}
        <DateQuickField
          label="Data"
          value={values.date}
          onChange={(date) => patch({ date })}
          error={errors.date}
        />
      </FormModalSplit>
      {editor.original ? (
        <OriginalFromBankNote original={editor.original} onRestore={editor.onRestoreOriginal} />
      ) : null}
      <FormModalMore
        defaultOpen={values.tags.length > 0}
        summary={values.tags.length > 0 ? undefined : 'tags'}
      >
        <TagEditor label="Tags" tags={values.tags} onChange={(tags) => patch({ tags })} />
      </FormModalMore>
    </FormModal>
  );
}
