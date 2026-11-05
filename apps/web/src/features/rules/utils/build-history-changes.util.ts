import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { ConfirmChange } from '@fincheck/ui';

type Options = {
  willChangeCount: number;
  examples: readonly Rule.Example[];
  /** Name of the category the rule puts, null when it only adds tags. */
  categoryName: string | null;
  /** Names of the tags the rule adds. */
  tagNames?: readonly string[];
  /** Name of a category by id. */
  nameOf: (id: string | null) => string;
};

function tagPhrase(tagNames: readonly string[]): string {
  return `${tagNames.length === 1 ? 'a tag' : 'as tags'} ${tagNames.join(', ')}`;
}

/**
 * The "o que muda" list of the "Aplicar a regra" dialogs, saying what really changes: the category
 * ("Mercado → Delivery"), the tags ("ganha a tag delivery") or both. A transaction already in the
 * rule's category only gains the tags, so it never reads "Delivery → Delivery".
 */
export function buildHistoryChanges({
  willChangeCount,
  examples,
  categoryName,
  tagNames = [],
  nameOf,
}: Options): ConfirmChange[] {
  const noun = willChangeCount === 1 ? 'transação' : 'transações';
  const hasTags = tagNames.length > 0;
  let first: string;

  if (categoryName && hasTags) {
    first = `${willChangeCount} ${noun} ${willChangeCount === 1 ? 'passa' : 'passam'} a ter a categoria ${categoryName} e ${tagPhrase(tagNames)}.`;
  } else if (categoryName) {
    first = `${willChangeCount} ${noun} ${willChangeCount === 1 ? 'vai' : 'vão'} para ${categoryName}.`;
  } else {
    first = `${willChangeCount} ${noun} ${willChangeCount === 1 ? 'ganha' : 'ganham'} ${hasTags ? tagPhrase(tagNames) : 'as tags da regra'}.`;
  }

  const tagText = hasTags ? `ganha ${tagPhrase(tagNames)}` : 'ganha as tags da regra';

  return [
    { icon: 'check', text: first },
    ...examples.map((example) => {
      const categoryChanges =
        example.toCategoryId !== null && example.toCategoryId !== example.fromCategoryId;
      const parts = [
        categoryChanges
          ? `${nameOf(example.fromCategoryId)} → ${nameOf(example.toCategoryId)}`
          : null,
        !categoryChanges || hasTags ? tagText : null,
      ].filter((part): part is string => part !== null);

      return {
        icon: 'chevron-right' as const,
        text: `${example.description}: ${parts.join(', ')}`,
      };
    }),
    { icon: 'lock', text: 'Edições feitas à mão não mudam.' },
  ];
}
