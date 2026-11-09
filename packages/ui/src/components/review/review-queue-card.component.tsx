import { Button } from '#/components/buttons/index.ts';
import { ChoiceChip } from '#/components/chips/index.ts';
import { Checkbox } from '#/components/forms/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import type {
  ReviewChoice,
  ReviewRule,
  ReviewTransaction,
} from '#/components/review/review.type.ts';
import { TagPicker, type TagPickerProps } from '#/components/transactions/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type ReviewQueueCardProps = {
  transaction: ReviewTransaction;
  /** The suggested categories (three, in the design), best first. */
  suggestions: readonly ReviewChoice[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  /** "Outra": opens the full category choice (the screen's). */
  onOtherCategory: () => void;
  /** The tag picker of the category on the card (all but the label). */
  tagPicker: Omit<TagPickerProps, 'label' | 'className'>;
  /** The rule the save would create; leave out when there is none to offer. */
  rule?: ReviewRule;
  /** False on the first transaction: "Voltar à anterior" is disabled. */
  canGoBack: boolean;
  onBack: () => void;
  onSkip: () => void;
  /** False when only this transaction is left: "Pular" is disabled. */
  canSkip?: boolean;
  onSave: () => void;
  saving?: boolean;
  className?: string;
};

/**
 * The transaction under review, one at a time (components.md 11.1): header with the bank
 * description and amount, "Categoria" suggestions, tags, the rule it would create and the actions.
 * Actions are full width on the phone.
 */
export function ReviewQueueCard({
  transaction,
  suggestions,
  selectedCategoryId,
  onSelectCategory,
  onOtherCategory,
  tagPicker,
  rule,
  canGoBack,
  onBack,
  onSkip,
  canSkip = true,
  onSave,
  saving = false,
  className,
}: ReviewQueueCardProps) {
  return (
    <section
      aria-label="Transação em revisão"
      className={cx('glass flex flex-col gap-s24 p-s16 lg:p-s24', className)}
    >
      <header className="flex items-center gap-s12 lg:gap-s16">
        <CategoryIcon icon={transaction.icon} type={transaction.kind} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-s4">
          <h2 className="text-subsection font-emphasis break-words text-fg-primary">
            {transaction.name}
          </h2>
          <p className="text-label text-fg-secondary">{transaction.detail}</p>
        </div>
        <Money
          cents={transaction.amountCents}
          sign={transaction.amountCents > 0 ? 'plus' : 'minus'}
          tone={transaction.amountCents > 0 ? 'income' : 'expense'}
          className="text-money-sm"
        />
      </header>
      <div role="group" aria-label="Categoria" className="flex flex-col gap-s8">
        <span className="text-label text-fg-secondary">Categoria</span>
        <div className="flex flex-wrap gap-s8">
          {suggestions.map((choice) => (
            <ChoiceChip
              key={choice.id}
              icon={choice.icon}
              selected={choice.id === selectedCategoryId}
              onChange={() => onSelectCategory(choice.id)}
            >
              {choice.label}
            </ChoiceChip>
          ))}
          <Button variant="tertiary" size="sm" icon="search" onPress={onOtherCategory}>
            Outra
          </Button>
        </div>
      </div>
      <TagPicker label="Tags" {...tagPicker} />
      {rule ? (
        <div className="flex flex-col">
          <Checkbox isSelected={rule.enabled} onChange={rule.onEnabledChange}>
            Sempre que a descrição tiver <strong className="font-emphasis">{rule.keyword}</strong>,
            usar esta categoria
          </Checkbox>
          <p className="ml-14 text-meta text-fg-secondary">
            {rule.matchCount > 0
              ? `Pega mais ${rule.matchCount} ${rule.matchCount === 1 ? 'transação' : 'transações'} do histórico. `
              : ''}
            Edições à mão não mudam.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-s8 lg:flex-row lg:items-center lg:justify-end lg:gap-s16">
        <Button
          variant="tertiary"
          icon="chevron-left"
          isDisabled={!canGoBack}
          onPress={onBack}
          fullWidth
          className="lg:mr-auto lg:w-auto"
        >
          Voltar à anterior
        </Button>
        <Button
          variant="secondary"
          isDisabled={!canSkip}
          onPress={onSkip}
          fullWidth
          className="lg:w-auto"
        >
          Pular
        </Button>
        <Button
          loading={saving}
          loadingLabel="Salvando..."
          isDisabled={selectedCategoryId === null}
          onPress={onSave}
          fullWidth
          className="lg:w-auto"
        >
          Salvar e ir para a próxima
        </Button>
      </div>
    </section>
  );
}
