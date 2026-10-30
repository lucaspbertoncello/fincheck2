import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import {
  Button,
  CategoryChoices,
  ChoiceChip,
  RuleSentenceText,
  RuleToken,
  TextField,
} from '@fincheck/ui';

import { TokenPopover } from '#/features/rules/rule-form/components/token-popover.component.tsx';
import type { CategoryGroup, TagOption } from '#/features/rules/rule-form/types/rule-form.type.ts';

const noop = () => undefined;

type RuleSentenceProps = {
  description: string;
  /** Without it the text is fixed (a suggestion keeps its pattern). */
  onDescriptionChange?: (value: string) => void;
  descriptionInvalid?: boolean;
  categoryId: string | null;
  categoryGroups: CategoryGroup[];
  /** Without it the category is fixed. `null` takes the category off. */
  onCategoryChange?: (categoryId: string | null) => void;
  tags: TagOption[];
  tagIds: string[];
  onTagIdsChange?: (tagIds: string[]) => void;
};

/**
 * "Sempre que a descrição contém [UBER *TRIP], categorizar como [Transporte] e adicionar a tag
 * [+ tag]": the blanks are tokens; each one that can change opens a small picker.
 */
export function RuleSentence({
  description,
  onDescriptionChange,
  descriptionInvalid = false,
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
  const selectedTags = tags.filter((tag) => tagIds.includes(tag.id));
  const tagLabel = selectedTags.map((tag) => tag.name).join(', ');

  return (
    <div className="flex flex-wrap items-center gap-x-s8 gap-y-s12">
      <RuleSentenceText>Sempre que</RuleSentenceText>
      <RuleToken kind="option">a descrição contém</RuleToken>

      {onDescriptionChange ? (
        <TokenPopover
          label="Trecho da descrição"
          trigger={
            <RuleToken
              kind={pattern ? 'value' : 'empty'}
              icon={pattern ? undefined : 'plus-circle'}
              trailing={pattern ? 'edit' : undefined}
              ariaLabel="Trecho da descrição"
              onPress={noop}
              className={descriptionInvalid ? 'border-alert!' : undefined}
            >
              {pattern || 'trecho'}
            </RuleToken>
          }
        >
          {(close) => (
            <form
              noValidate
              className="flex flex-col gap-s12"
              onSubmit={(event) => {
                event.preventDefault();
                // The popover is a portal inside the modal's React tree: without this the Enter
                // would also submit the rule form around it.
                event.stopPropagation();
                close();
              }}
            >
              <TextField
                label="Trecho da descrição"
                value={description}
                onChange={onDescriptionChange}
                description="Maiúsculas e acentos não importam."
                maxLength={100}
                autoComplete="off"
                autoFocus
              />
              <Button type="submit" size="sm">
                Pronto
              </Button>
            </form>
          )}
        </TokenPopover>
      ) : (
        <RuleToken kind="value">{pattern}</RuleToken>
      )}

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
