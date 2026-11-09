import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import type { LoadRuleHistoryCandidatesQuery } from '#/modules/transactions/application/category-rule-history/load-rule-history-candidates.query.ts';
import { canRuleSetCategory } from '#/modules/transactions/domain/transaction/can-rule-set-category.util.ts';

// What a category rule does to the history, without writing: which transactions it matches, which
// of those it would change (BR-CAT-006) and up to three examples, the most recent first. Pure, to be
// tested without a database.
//
// - `matches`: the matching of `categories`, handed over as a function, so there is one matching
//   for the import, the preview and the history. A rule with a category only sees transactions of
//   its kind (an expense rule never puts a category in an income), except a category that is a
//   transfer, which sees both directions.
// - A rule with a category changes a match when the category is free for it (not put by an older
//   rule) and differs from the current one, or a tag is missing.
//   A rule with no category (tags only) adds its tags to the matches that are free.
// - What Lucas, a recurrence or a bill categorized is never touched, by any rule (PM, 06/11).
//   With no action at all (a preview of a rule not finished) every match counts as a change.
export function classifyRuleEffect(
  candidates: LoadRuleHistoryCandidatesQuery.Candidate[],
  definition: classifyRuleEffect.Definition,
): classifyRuleEffect.Output {
  const matched = candidates.filter(
    (candidate) =>
      (definition.categoryKind === null ||
        definition.categoryIsTransfer === true ||
        definition.categoryKind === candidate.nature) &&
      definition.matches(candidate),
  );

  const changes = matched.filter((candidate) => {
    // A rule with no action does not exist (only the preview of a form still being filled in).
    if (definition.categoryId === null && definition.tagIds.length === 0) return true;
    // Edited by hand (and by a recurrence or a bill): no rule touches it, category or tags.
    if (candidate.categorySource !== null && candidate.categorySource !== 'rule') return false;
    const missingTag = definition.tagIds.some((tagId) => !candidate.tagIds.includes(tagId));
    if (definition.categoryId === null) return missingTag;
    if (!canRuleSetCategory(candidate, definition.olderRuleIds)) return false;

    return candidate.categoryId !== definition.categoryId || missingTag;
  });

  const examples = [...changes]
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id))
    .slice(0, 3)
    .map((candidate) => ({
      transactionId: candidate.id,
      description: candidate.description,
      occurredOn: candidate.occurredOn,
      amountCents: candidate.amountCents,
      fromCategoryId: candidate.categoryId,
      toCategoryId: definition.categoryId,
    }));

  return { matchCount: matched.length, changes, examples };
}

export namespace classifyRuleEffect {
  export type Definition = {
    categoryId: string | null;
    categoryKind: 'expense' | 'income' | null;
    // The category is a transfer between own accounts: what it takes becomes a `transfer`.
    categoryIsTransfer?: boolean;
    tagIds: string[];
    // The rules older than this one: what they categorized stays (N9).
    olderRuleIds: ReadonlySet<string>;
    matches: (candidate: LoadRuleHistoryCandidatesQuery.Candidate) => boolean;
  };

  export type Output = {
    matchCount: number;
    changes: LoadRuleHistoryCandidatesQuery.Candidate[];
    examples: Rule.Example[];
  };
}
