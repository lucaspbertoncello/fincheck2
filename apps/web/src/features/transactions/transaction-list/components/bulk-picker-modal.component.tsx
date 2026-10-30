import { Button, CategoryChoices, ChoiceChip, Modal } from '@fincheck/ui';

import type { BulkPickerView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';
import { countWord } from '#/features/transactions/transaction-list/utils/count-word.util.ts';

type BulkPickerModalProps = {
  bulk: BulkPickerView;
};

/** Asks for the category or the tag a bulk action will put on the selected transactions. */
export function BulkPickerModal({ bulk }: BulkPickerModalProps) {
  const isCategory = bulk.picker === 'category';
  const ready = isCategory ? bulk.categoryId !== null : bulk.tagId !== null;
  const selected = countWord(bulk.count, 'transação selecionada', 'transações selecionadas');

  return (
    <Modal
      isOpen={bulk.picker !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) bulk.onClose();
      }}
      isDismissable={!bulk.pending}
      title={isCategory ? 'Categorizar' : 'Adicionar tag'}
      subtitle={selected}
      size="wide"
      actions={
        <>
          <Button variant="secondary" isDisabled={bulk.pending} onPress={bulk.onClose}>
            Cancelar
          </Button>
          <Button
            isDisabled={!ready}
            loading={bulk.pending}
            loadingLabel="Aplicando..."
            onPress={bulk.onApply}
          >
            Aplicar
          </Button>
        </>
      }
    >
      {isCategory ? (
        <>
          {bulk.expenseCategories.length > 0 ? (
            <CategoryChoices
              label="Categorias de despesa"
              categories={bulk.expenseCategories}
              value={bulk.categoryId}
              onChange={bulk.onCategoryChange}
            />
          ) : null}
          {bulk.incomeCategories.length > 0 ? (
            <CategoryChoices
              label="Categorias de receita"
              categories={bulk.incomeCategories}
              value={bulk.categoryId}
              onChange={bulk.onCategoryChange}
            />
          ) : null}
        </>
      ) : (
        <div role="group" aria-label="Tags" className="flex flex-wrap gap-s8">
          {bulk.tags.map((tag) => (
            <ChoiceChip
              key={tag.id}
              icon="hash"
              selected={tag.id === bulk.tagId}
              onChange={() => bulk.onTagChange(tag.id)}
            >
              {tag.name}
            </ChoiceChip>
          ))}
          {bulk.tags.length === 0 ? (
            <p className="text-body text-fg-secondary">
              Ainda não há tags. Crie uma na edição de uma transação.
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
