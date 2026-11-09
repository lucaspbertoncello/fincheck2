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
 * "Categorizar", the most used categories as chips with "Outras…" for the search, only the ones that
 * fit every selected transaction (a selection of credits on a card has two groups: "Abate gasto"
 * and "Conta como receita"); for "Tag", the tags as chips. "Aplicar" waits until
 * something is chosen and says so.
 */
export function BulkPickerModal({ bulk }: BulkPickerModalProps) {
  const isCategory = bulk.picker === 'category';
  const ready = isCategory ? bulk.categoryId !== null : bulk.tagId !== null;
  const selected = countWord(bulk.count, 'transação selecionada', 'transações selecionadas');
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
        bulk.categories.length > 0 ? (
          <CategoryChipsField
            categories={bulk.categories}
            value={bulk.categoryId}
            onChange={bulk.onCategoryChange}
          />
        ) : (
          <p className="text-body text-fg-secondary">
            {bulk.noCategoryReason === 'none-takes'
              ? 'Nenhuma das transações selecionadas aceita categoria: as divididas, as transferências e os pagamentos de fatura ficam como estão.'
              : 'Nenhuma categoria serve a todas as transações selecionadas: despesas e receitas não dividem categoria. Selecione só despesas, ou só receitas.'}
          </p>
        )
      ) : bulk.tags.length === 0 ? (
        <p className="text-body text-fg-secondary">
          Ainda não há tags. Crie uma dentro de uma categoria, em Categorias › Tags, ou na edição de
          uma transação.
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
      {!isCategory && bulk.tags.length > 0 ? (
        <p className="text-label text-fg-secondary">
          A tag só entra nas transações da categoria dela. As outras ficam como estavam.
        </p>
      ) : null}
    </FormModal>
  );
}
