import { ChoiceField, FormModal, SelectField } from '@fincheck/ui';

import { CategoryChipsField } from '#/features/transactions/components/category-chips-field.component.tsx';
import type { BulkPickerView } from '#/shared/types/transactions/transaction-list-view.type.ts';
import { countWord } from '#/shared/utils/text/count-word.util.ts';

type BulkPickerModalProps = {
  bulk: BulkPickerView;
};

/** Up to this many tags show as chips; more go to a list. */
const TAG_CHIP_LIMIT = 6;

/**
 * What a bulk action will put on the selected transactions, in the form-modal pattern: for
 * "Categorizar", the most used categories as chips with "Outras…" for the search (expenses and
 * incomes apart when the selection has both); for "Tag", the tags as chips. "Aplicar" waits until
 * something is chosen and says so.
 */
export function BulkPickerModal({ bulk }: BulkPickerModalProps) {
  const isCategory = bulk.picker === 'category';
  const ready = isCategory ? bulk.categoryId !== null : bulk.tagId !== null;
  const selected = countWord(bulk.count, 'transação selecionada', 'transações selecionadas');
  const both = bulk.expenseCategories.length > 0 && bulk.incomeCategories.length > 0;
  const tagOptions = bulk.tags.map((tag) => ({
    key: tag.id,
    label: tag.name,
    icon: 'hash' as const,
  }));

  return (
    <FormModal
      isOpen={bulk.picker !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) bulk.onClose();
      }}
      title={isCategory ? 'Categorizar' : 'Adicionar tag'}
      description={selected}
      submitLabel="Aplicar"
      submittingLabel="Aplicando..."
      isSubmitting={bulk.pending}
      submitDisabled={!ready}
      submitHint={ready ? undefined : isCategory ? 'Escolha uma categoria.' : 'Escolha uma tag.'}
      onSubmit={bulk.onApply}
      size="wide"
    >
      {isCategory ? (
        <>
          {bulk.expenseCategories.length > 0 ? (
            <CategoryChipsField
              label={both ? 'Categorias de despesa' : 'Categoria'}
              categories={bulk.expenseCategories}
              value={bulk.categoryId}
              onChange={bulk.onCategoryChange}
            />
          ) : null}
          {bulk.incomeCategories.length > 0 ? (
            <CategoryChipsField
              label={both ? 'Categorias de receita' : 'Categoria'}
              categories={bulk.incomeCategories}
              value={bulk.categoryId}
              onChange={bulk.onCategoryChange}
            />
          ) : null}
        </>
      ) : bulk.tags.length === 0 ? (
        <p className="text-body text-fg-secondary">
          Ainda não há tags. Crie uma na edição de uma transação.
        </p>
      ) : bulk.tags.length > TAG_CHIP_LIMIT ? (
        <SelectField
          label="Tag"
          options={tagOptions}
          value={bulk.tagId}
          onChange={bulk.onTagChange}
          placeholder="Escolher tag"
        />
      ) : (
        <ChoiceField
          label="Tag"
          options={tagOptions}
          value={bulk.tagId}
          onChange={bulk.onTagChange}
        />
      )}
    </FormModal>
  );
}
