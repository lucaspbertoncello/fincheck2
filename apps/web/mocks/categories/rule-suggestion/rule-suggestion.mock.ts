import { createRuleResultSchema } from '@fincheck/shared/categories/rule/rule.schema.ts';
import {
  acceptRuleSuggestionRequestSchema,
  dismissRuleSuggestionRequestSchema,
  listRuleSuggestionsQuerySchema,
  ruleSuggestionDtoSchema,
} from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.schema.ts';
import type { RuleSuggestion } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.type.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { http } from 'msw';

import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { computeRuleEffect } from '#mocks/categories/rule/compute-rule-effect.util.ts';
import { createRule } from '#mocks/categories/rule/create-rule.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

// A suggestion exists when Lucas put 3 or more transactions with the same description in the same
// category by hand, no enabled rule already covers it and nobody answered it yet.
function computeSuggestions(transactionIds: string[] | null): RuleSuggestion.Dto[] {
  const groups = new Map<string, { pattern: string; categoryId: string; ids: string[] }>();
  for (const tx of db.transactions) {
    if (tx.categorySource !== 'user' || !tx.categoryId || tx.ignoredAt || tx.splits.length > 0)
      continue;
    const category = db.categories.find((item) => item.id === tx.categoryId);
    if (!category || category.archivedAt || category.kind !== tx.nature) continue;
    const pattern = normalizeText(tx.description);
    const key = `${pattern}|${tx.categoryId}`;
    const group = groups.get(key) ?? { pattern, categoryId: tx.categoryId, ids: [] };
    group.ids.push(tx.id);
    groups.set(key, group);
  }

  const result: RuleSuggestion.Dto[] = [];
  for (const group of groups.values()) {
    if (group.ids.length < 3) continue;
    const covered = db.rules.some(
      (rule) =>
        rule.enabled &&
        rule.categoryId === group.categoryId &&
        (rule.descriptionContains === null || group.pattern.includes(rule.descriptionContains)),
    );
    const decided = db.ruleSuggestionDecisions.some(
      (item) => item.pattern === group.pattern && item.categoryId === group.categoryId,
    );
    if (covered || decided) continue;
    if (transactionIds && !group.ids.some((id) => transactionIds.includes(id))) continue;
    const category = db.categories.find((item) => item.id === group.categoryId);
    if (!category) continue;
    const effect = computeRuleEffect(
      db,
      { descriptionContains: group.pattern, categoryId: group.categoryId },
      NOW_ISO,
    );
    result.push({
      pattern: group.pattern,
      categoryId: group.categoryId,
      kind: category.kind,
      recategorizedCount: group.ids.length,
      matchCount: effect.matches.length,
      willChangeCount: effect.changes.length,
      examples: effect.examples,
    });
  }

  return result.sort(
    (a, b) => b.recategorizedCount - a.recategorizedCount || a.pattern.localeCompare(b.pattern),
  );
}

export const ruleSuggestionMock = [
  http.get(
    '/api/rule-suggestions',
    handleRoute(
      {
        query: listRuleSuggestionsQuerySchema,
        response: listResponseSchema(ruleSuggestionDtoSchema),
      },
      ({ query }) => ({
        items: computeSuggestions(
          query.transactionIds ? query.transactionIds.split(',').filter(Boolean) : null,
        ),
      }),
    ),
  ),

  http.post(
    '/api/rule-suggestions/accept',
    handleRoute(
      { body: acceptRuleSuggestionRequestSchema, response: createRuleResultSchema, status: 201 },
      ({ body }) => {
        const pattern = normalizeText(body.pattern);
        const result = createRule(db, {
          descriptionContains: pattern,
          categoryId: body.categoryId,
          tagIds: body.tagIds,
          applyToHistory: body.applyToHistory,
        });
        db.ruleSuggestionDecisions.push({
          pattern,
          categoryId: body.categoryId,
          status: 'accepted',
        });

        return result;
      },
    ),
  ),

  http.post(
    '/api/rule-suggestions/dismiss',
    handleRoute({ body: dismissRuleSuggestionRequestSchema }, ({ body }) => {
      findCategory(db, body.categoryId);
      const pattern = normalizeText(body.pattern);
      const known = db.ruleSuggestionDecisions.some(
        (item) => item.pattern === pattern && item.categoryId === body.categoryId,
      );
      if (!known)
        db.ruleSuggestionDecisions.push({
          pattern,
          categoryId: body.categoryId,
          status: 'dismissed',
        });
    }),
  ),
];
