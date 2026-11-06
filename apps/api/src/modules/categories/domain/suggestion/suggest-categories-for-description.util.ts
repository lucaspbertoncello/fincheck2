// The categories the review queue suggests for a transaction ("Parece Restaurantes"): up to three
// active categories of the right kind. First those Lucas already used for that very description
// (`history`, the most used first), then those a rule that is on points to (`rule`). Pure.
//
// - `kind` comes from the sign of the amount: negative is an expense.
// - A rule counts when its description condition is contained in the description and its kind and
//   amount range fit. A rule with a condition on the sender or the account is left out: the
//   queue does not carry them, so it cannot tell.
export function suggestCategoriesForDescription(input: {
  // Normalized, without the "n/N" of an installment.
  description: string;
  amountCents: number;
  // How many times Lucas put this description in each category.
  historyCounts: ReadonlyMap<string, number>;
  // Rules that are on, the oldest first.
  rules: {
    descriptionContains: string | null;
    counterpartyContains: string | null;
    accountId: string | null;
    kind: 'expense' | 'income' | null;
    amountMinCents: number | null;
    amountMaxCents: number | null;
    categoryId: string | null;
  }[];
  categories: ReadonlyMap<string, { kind: 'expense' | 'income'; isArchived: boolean }>;
}): { categoryId: string; reason: 'history' | 'rule' }[] {
  const kind = input.amountCents < 0 ? 'expense' : 'income';
  const amount = Math.abs(input.amountCents);
  const fits = (categoryId: string) => {
    const category = input.categories.get(categoryId);

    return category !== undefined && !category.isArchived && category.kind === kind;
  };

  const history = [...input.historyCounts]
    .filter(([categoryId]) => fits(categoryId))
    .sort(([idA, countA], [idB, countB]) => countB - countA || idA.localeCompare(idB))
    .map(([categoryId]) => ({ categoryId, reason: 'history' as const }));

  const fromRules = input.rules
    .filter(
      (rule) =>
        rule.categoryId !== null &&
        rule.descriptionContains !== null &&
        rule.counterpartyContains === null &&
        rule.accountId === null &&
        input.description.includes(rule.descriptionContains) &&
        (rule.kind === null || rule.kind === kind) &&
        (rule.amountMinCents === null || amount >= rule.amountMinCents) &&
        (rule.amountMaxCents === null || amount <= rule.amountMaxCents),
    )
    .flatMap((rule) => (rule.categoryId !== null && fits(rule.categoryId) ? [rule.categoryId] : []))
    .map((categoryId) => ({ categoryId, reason: 'rule' as const }));

  const seen = new Set<string>();
  const merged: { categoryId: string; reason: 'history' | 'rule' }[] = [];
  for (const suggestion of [...history, ...fromRules]) {
    if (seen.has(suggestion.categoryId)) continue;
    seen.add(suggestion.categoryId);
    merged.push(suggestion);
  }

  return merged.slice(0, 3);
}
