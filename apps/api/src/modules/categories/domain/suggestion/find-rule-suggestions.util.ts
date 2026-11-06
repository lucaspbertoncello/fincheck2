// The rule suggestions (BR-CAT-005): when Lucas put by hand, in the same active category, three or
// more transactions with the same description, and no rule that is on covers that pair, and he did
// not answer it yet, the app offers a rule. Pure: the use case reads the facts and calls this.
//
// - "Covers" (N11): a rule that is on, whose category is the one of the suggestion and whose
//   `descriptionContains` is contained in the pattern. Its other conditions do not count.
// - `decided` are the answers already given ("Agora não" or "Criar regra") to a pattern and category.
// - `transactionIds`, when given, keeps only the suggestions whose group has one of them.
// - Order: the most repeated first, then the pattern, then the category.
export function findRuleSuggestions(input: {
  // The pattern is the description in use, normalized.
  manualCategorizations: { transactionId: string; pattern: string; categoryId: string }[];
  categories: ReadonlyMap<string, { kind: 'expense' | 'income'; isArchived: boolean }>;
  enabledRules: { descriptionContains: string | null; categoryId: string | null }[];
  decided: { pattern: string; categoryId: string }[];
  transactionIds: ReadonlySet<string> | null;
}): {
  pattern: string;
  categoryId: string;
  kind: 'expense' | 'income';
  recategorizedCount: number;
}[] {
  const SEPARATOR = '\u0000';
  const decided = new Set(
    input.decided.map((item) => `${item.pattern}${SEPARATOR}${item.categoryId}`),
  );

  const groups = new Map<string, { pattern: string; categoryId: string; ids: string[] }>();
  for (const item of input.manualCategorizations) {
    const key = `${item.pattern}${SEPARATOR}${item.categoryId}`;
    const group = groups.get(key) ?? {
      pattern: item.pattern,
      categoryId: item.categoryId,
      ids: [],
    };
    group.ids.push(item.transactionId);
    groups.set(key, group);
  }

  const suggestions: {
    pattern: string;
    categoryId: string;
    kind: 'expense' | 'income';
    recategorizedCount: number;
  }[] = [];
  for (const [key, group] of groups) {
    if (group.pattern === '' || group.ids.length < 3 || decided.has(key)) continue;
    const category = input.categories.get(group.categoryId);
    if (!category || category.isArchived) continue;
    const covered = input.enabledRules.some(
      (rule) =>
        rule.categoryId === group.categoryId &&
        rule.descriptionContains !== null &&
        group.pattern.includes(rule.descriptionContains),
    );
    if (covered) continue;
    const transactionIds = input.transactionIds;
    if (transactionIds !== null && !group.ids.some((id) => transactionIds.has(id))) continue;

    suggestions.push({
      pattern: group.pattern,
      categoryId: group.categoryId,
      kind: category.kind,
      recategorizedCount: group.ids.length,
    });
  }

  return suggestions.sort(
    (a, b) =>
      b.recategorizedCount - a.recategorizedCount ||
      a.pattern.localeCompare(b.pattern) ||
      a.categoryId.localeCompare(b.categoryId),
  );
}
