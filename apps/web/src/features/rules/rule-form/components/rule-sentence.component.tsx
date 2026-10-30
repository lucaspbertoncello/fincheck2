import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { Button, CategoryChoices, ChoiceChip, RuleSentenceText, RuleToken } from '@fincheck/ui';

import { SentenceInput } from '#/features/rules/rule-form/components/sentence-input.component.tsx';
import { TokenPopover } from '#/features/rules/rule-form/components/token-popover.component.tsx';
import type {
  AccountOption,
  CategoryGroup,
  TagOption,
} from '#/features/rules/rule-form/types/rule-form.type.ts';

const noop = () => undefined;

type RuleSentenceProps = {
  description: string;
  /** Without it the text is fixed (a suggestion keeps its pattern). */
  onDescriptionChange?: (value: string) => void;
  descriptionInvalid?: boolean;
  /** Without `onAccountChange` the account blank is left out of the sentence. */
  accountId?: string | null;
  accounts?: AccountOption[];
  onAccountChange?: (accountId: string | null) => void;
  categoryId: string | null;
  categoryGroups: CategoryGroup[];
  /** Without it the category is fixed. `null` takes the category off. */
  onCategoryChange?: (categoryId: string | null) => void;
  tags: TagOption[];
  tagIds: string[];
  onTagIdsChange?: (tagIds: string[]) => void;
};

/**
 * "Quando a descrição contém [MERCADO] em [qualquer conta], categorizar como [Mercado] e adicionar
 * a tag [+ tag]": the text is typed in place; the other blanks are tokens that open a small picker.
 */
export function RuleSentence({
  description,
  onDescriptionChange,
  descriptionInvalid = false,
  accountId = null,
  accounts = [],
  onAccountChange,
  categoryId,
  categoryGroups,
  onCategoryChange,
  tags,
  tagIds,
  onTagIdsChange,
}: RuleSentenceProps) {
  const pattern = normalizeText(description);
  const category = categoryGroups
    .flatMap((group) => group.options)
    .find((option) => option.id === categoryId);
  const account = accounts.find((option) => option.id === accountId);
  const selectedTags = tags.filter((tag) => tagIds.includes(tag.id));
  const tagLabel = selectedTags.map((tag) => tag.name).join(', ');

  return (
    <div className="flex flex-wrap items-center gap-x-s8 gap-y-s12">
      <RuleSentenceText>Quando</RuleSentenceText>
      <RuleToken kind="option">a descrição contém</RuleToken>

      {onDescriptionChange ? (
        <SentenceInput
          label="Trecho da descrição"
          value={description}
          onChange={onDescriptionChange}
          invalid={descriptionInvalid}
          placeholder="ex.: mercado"
          maxLength={100}
        />
      ) : (
        <RuleToken kind="value">{pattern}</RuleToken>
      )}

      {onAccountChange ? (
        <>
          <RuleSentenceText>em</RuleSentenceText>
          <TokenPopover
            label="Conta da regra"
            trigger={
              <RuleToken
                kind={account ? 'value' : 'option'}
                icon="wallet"
                trailing="dropdown"
                ariaLabel="Conta da regra"
                onPress={noop}
              >
                {account?.name ?? 'qualquer conta'}
              </RuleToken>
            }
          >
            {(close) => (
              <div role="group" aria-label="Contas" className="flex flex-wrap gap-s8">
                <ChoiceChip
                  selected={accountId === null}
                  onChange={() => {
                    onAccountChange(null);
                    close();
                  }}
                >
                  Qualquer conta
                </ChoiceChip>
                {accounts.map((option) => (
                  <ChoiceChip
                    key={option.id}
                    selected={option.id === accountId}
                    onChange={() => {
                      onAccountChange(option.id);
                      close();
                    }}
                  >
                    {option.name}
                  </ChoiceChip>
                ))}
              </div>
            )}
          </TokenPopover>
        </>
      ) : null}

      <RuleSentenceText>, categorizar como</RuleSentenceText>
      {onCategoryChange ? (
        <TokenPopover
          label="Categoria da regra"
          trigger={
            <RuleToken
              kind={category ? 'category' : 'empty'}
              icon={category ? category.icon : 'plus-circle'}
              trailing={category ? 'dropdown' : undefined}
              ariaLabel="Categoria da regra"
              onPress={noop}
            >
              {category?.name ?? 'categoria'}
            </RuleToken>
          }
        >
          {(close) => (
            <>
              {categoryGroups.map((group) => (
                <CategoryChoices
                  key={group.label}
                  label={group.label}
                  categories={group.options}
                  value={categoryId}
                  onChange={(id) => {
                    onCategoryChange(id);
                    close();
                  }}
                />
              ))}
              {category ? (
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={() => {
                    onCategoryChange(null);
                    close();
                  }}
                >
                  Só adicionar tag, sem categoria
                </Button>
              ) : null}
            </>
          )}
        </TokenPopover>
      ) : (
        <RuleToken kind="category" icon={category?.icon}>
          {category?.name ?? 'categoria'}
        </RuleToken>
      )}

      <RuleSentenceText>
        {selectedTags.length > 1 ? 'e adicionar as tags' : 'e adicionar a tag'}
      </RuleSentenceText>
      {onTagIdsChange ? (
        <TokenPopover
          label="Tags da regra"
          trigger={
            <RuleToken
              kind={selectedTags.length > 0 ? 'value' : 'empty'}
              icon={selectedTags.length > 0 ? 'hash' : 'plus-circle'}
              trailing={selectedTags.length > 0 ? 'dropdown' : undefined}
              ariaLabel="Tags da regra"
              onPress={noop}
            >
              {selectedTags.length > 0 ? tagLabel : 'tag'}
            </RuleToken>
          }
        >
          {(close) => (
            <>
              {tags.length === 0 ? (
                <p className="text-label text-fg-secondary">
                  Você ainda não tem tags. Crie uma em Categorias, na seção Tags.
                </p>
              ) : (
                <div role="group" aria-label="Tags" className="flex flex-wrap gap-s8">
                  {tags.map((tag) => (
                    <ChoiceChip
                      key={tag.id}
                      icon="hash"
                      selected={tagIds.includes(tag.id)}
                      onChange={(selected) =>
                        onTagIdsChange(
                          selected ? [...tagIds, tag.id] : tagIds.filter((id) => id !== tag.id),
                        )
                      }
                    >
                      {tag.name}
                    </ChoiceChip>
                  ))}
                </div>
              )}
              <Button size="sm" onPress={close}>
                Pronto
              </Button>
            </>
          )}
        </TokenPopover>
      ) : selectedTags.length > 0 ? (
        <RuleToken kind="value" icon="hash">
          {tagLabel}
        </RuleToken>
      ) : null}
    </div>
  );
}
