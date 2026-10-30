import { Button } from '#/components/buttons/index.ts';
import { cx } from '#/utils/class-names.util.ts';
import { MoneyField, TextField } from '#/components/forms/index.ts';
import type { CategoryOption } from '#/components/transactions/category-option.type.ts';
import { CategoryChoices } from '#/components/transactions/edit/category-choices.component.tsx';
import { EditDateField } from '#/components/transactions/edit/edit-date-field.component.tsx';
import { NatureField } from '#/components/transactions/edit/nature-field.component.tsx';
import { OriginalFromBankNote } from '#/components/transactions/edit/original-from-bank-note.component.tsx';
import { TagEditor } from '#/components/transactions/edit/tag-editor.component.tsx';
import type {
  CounterpartOption,
  OriginalFromBank,
  TransactionEditErrors,
  TransactionEditValues,
} from '#/components/transactions/edit/transaction-edit.type.ts';

type TransactionEditPanelProps = {
  values: TransactionEditValues;
  onChange: (values: TransactionEditValues) => void;
  categories: readonly CategoryOption[];
  /** Candidates for the other leg of a transfer. */
  counterparts?: readonly CounterpartOption[];
  /** Error per field, from `validateTransactionEdit` or from the server. */
  errors?: TransactionEditErrors;
  /** The bank's version, when the transaction was edited. */
  original?: OriginalFromBank;
  onRestoreOriginal?: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  className?: string;
};

/**
 * Content of the edit panel (components.md 6.1; the modal or sheet around it is the screen's):
 * description, amount, date, type, category, tags, the bank's original and the actions. Three
 * columns on the desktop, two on the phone. Errors sit under their fields; every value is a prop.
 */
export function TransactionEditPanel({
  values,
  onChange,
  categories,
  counterparts = [],
  errors = {},
  original,
  onRestoreOriginal,
  onSave,
  onCancel,
  saving = false,
  className,
}: TransactionEditPanelProps) {
  const patch = (changes: Partial<TransactionEditValues>) => onChange({ ...values, ...changes });

  return (
    <form
      noValidate
      aria-label="Editar transação"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className={cx(
        'flex flex-col gap-s16 rounded-panel border border-line bg-subtle p-s16',
        className,
      )}
    >
      <div className="grid grid-cols-2 gap-s16 lg:grid-cols-3">
        <TextField
          label="Descrição"
          value={values.description}
          onChange={(description) => patch({ description })}
          error={errors.description}
          autoComplete="off"
          className="col-span-2 lg:col-span-1"
        />
        <MoneyField
          label="Valor"
          cents={values.amountCents}
          onChange={(amountCents) => patch({ amountCents })}
          error={errors.amount}
        />
        <EditDateField
          label="Data"
          value={values.date}
          onChange={(date) => patch({ date })}
          error={errors.date}
        />
        <div className="col-span-2 lg:col-span-3">
          <NatureField
            nature={values.nature}
            onNatureChange={(nature) => patch({ nature })}
            counterparts={counterparts}
            counterpartId={values.counterpartId}
            onCounterpartChange={(counterpartId) => patch({ counterpartId })}
            counterpartError={errors.counterpart}
          />
        </div>
        <CategoryChoices
          label="Categoria"
          categories={categories}
          value={values.categoryId}
          onChange={(categoryId) => patch({ categoryId })}
          error={errors.category}
          className="col-span-2 lg:col-span-3"
        />
        <TagEditor
          label="Tags"
          tags={values.tags}
          onChange={(tags) => patch({ tags })}
          className="col-span-2 lg:col-span-3"
        />
        {original && onRestoreOriginal ? (
          <div className="col-span-2 lg:col-span-3">
            <OriginalFromBankNote original={original} onRestore={onRestoreOriginal} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-s8 lg:flex-row lg:justify-end">
        <Button variant="secondary" onPress={onCancel} fullWidth className="lg:w-auto">
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={saving}
          loadingLabel="Salvando..."
          fullWidth
          className="lg:w-auto"
        >
          Salvar
        </Button>
      </div>
    </form>
  );
}
