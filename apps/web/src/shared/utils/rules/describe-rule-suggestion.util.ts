import { countWord } from '#/shared/utils/text/count-word.util.ts';

/**
 * The offer of a rule seen in the history: "12 transações com a descrição “UBER *TRIP” estão em
 * Transporte. A regra põe essa categoria nas próximas sozinha." It does not say "você moveu": the
 * transactions may have been posted already in the category.
 */
export function describeRuleSuggestion(input: {
  count: number;
  pattern: string;
  categoryName: string | undefined;
}): string {
  const { count, pattern, categoryName } = input;
  const verb = count === 1 ? 'está' : 'estão';

  return `${countWord(count, 'transação', 'transações')} com a descrição “${pattern}” ${verb} em ${categoryName ?? 'uma categoria'}. A regra põe essa categoria nas próximas sozinha.`;
}
