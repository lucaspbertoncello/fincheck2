import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import type { ConfirmChange } from '@fincheck/ui';

type Options = {
  willChangeCount: number;
  examples: readonly Rule.Example[];
  /** Name of the category the rule puts, null when it only adds tags. */
  categoryName: string | null;
  /** Name of a category by id. */
  nameOf: (id: string | null) => string;
};

/** The "o que muda" list of the "Aplicar a regra no histórico?" dialog. */
export function buildHistoryChanges({
  willChangeCount,
  examples,
  categoryName,
  nameOf,
}: Options): ConfirmChange[] {
  const noun = willChangeCount === 1 ? 'transação' : 'transações';
  const verb = willChangeCount === 1 ? 'vai' : 'vão';
  const first = categoryName
    ? `${willChangeCount} ${noun} ${verb} para ${categoryName}.`
    : `${willChangeCount} ${noun} ${verb} ganhar as tags da regra.`;

  return [
    { icon: 'check', text: first },
    ...examples.map((example) => ({
      icon: 'chevron-right' as const,
      text: `${example.description}: ${nameOf(example.fromCategoryId)} para ${nameOf(example.toCategoryId)}`,
    })),
    { icon: 'lock', text: 'Edições feitas à mão não mudam.' },
  ];
}
