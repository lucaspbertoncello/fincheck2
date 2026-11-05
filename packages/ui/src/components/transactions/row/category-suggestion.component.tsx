import { Button } from '#/components/buttons/index.ts';
import { ChoiceChip } from '#/components/chips/index.ts';
import type { CategoryOption } from '#/components/transactions/category-option.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type CategorySuggestionProps = {
  suggestion: CategoryOption;
  /** Accepts the suggested category. */
  onAccept: (categoryId: string) => void;
  onChooseOther: () => void;
  selectionMode?: boolean;
};

/** "Parece [Restaurantes] Escolher outra", under a row without category (RF-CAT-008). */
export function CategorySuggestion({
  suggestion,
  onAccept,
  onChooseOther,
  selectionMode,
}: CategorySuggestionProps) {
  return (
    <div
      className={cx(
        'mb-s16 flex flex-wrap items-center gap-s8 text-label text-fg-secondary',
        selectionMode ? 'ml-22 lg:ml-23' : 'ml-12 lg:ml-13',
      )}
    >
      <span>Parece</span>
      <ChoiceChip selected={false} icon={suggestion.icon} onChange={() => onAccept(suggestion.id)}>
        {suggestion.name}
      </ChoiceChip>
      <Button variant="tertiary" size="sm" onPress={onChooseOther}>
        Escolher outra
      </Button>
    </div>
  );
}
