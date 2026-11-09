import {
  applyRuleResultSchema,
  createRuleRequestSchema,
  createRuleResultSchema,
  previewRuleRequestSchema,
  rulePreviewSchema,
  ruleDtoSchema,
  updateRuleRequestSchema,
} from '@fincheck/shared/categories/rule/rule.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { http } from 'msw';

import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { findTag } from '#mocks/categories/tag/find-tag.util.ts';
import { applyRule } from '#mocks/categories/rule/apply-rule.util.ts';
import { computeRuleEffect } from '#mocks/categories/rule/compute-rule-effect.util.ts';
import { createRule } from '#mocks/categories/rule/create-rule.util.ts';
import { presentRule } from '#mocks/categories/rule/present-rule.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';

function findRule(id: string): MockState.RuleRecord {
  return (
    db.rules.find((rule) => rule.id === id) ?? fail(404, 'RULE_NOT_FOUND', 'A regra não existe')
  );
}

export const ruleMock = [
  http.get(
    '/api/rules',
    handleRoute({ response: listResponseSchema(ruleDtoSchema) }, () => ({
      items: [...db.rules]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
        .map((rule) => presentRule(db, rule)),
    })),
  ),

  http.post(
    '/api/rules/preview',
    handleRoute({ body: previewRuleRequestSchema, response: rulePreviewSchema }, ({ body }) => {
      // Same order as the API: the account, the category, the tags, then the kind.
      if (body.accountId) findAccount(db, body.accountId);
      const category = body.categoryId ? findCategory(db, body.categoryId) : null;
      for (const tagId of body.tagIds ?? []) findTag(db, tagId);
      if (category && body.kind && body.kind !== category.kind)
        fail(422, 'RULE_CATEGORY_KIND_MISMATCH', 'Tipo diferente do da categoria');
      const effect = computeRuleEffect(db, body, NOW_ISO);

      return {
        matchCount: effect.matches.length,
        willChangeCount: effect.changes.length,
        examples: effect.examples,
      };
    }),
  ),

  http.post(
    '/api/rules',
    handleRoute(
      { body: createRuleRequestSchema, response: createRuleResultSchema, status: 201 },
      ({ body }) => createRule(db, body),
    ),
  ),

  http.patch(
    '/api/rules/:id',
    handleRoute({ body: updateRuleRequestSchema, response: ruleDtoSchema }, ({ params, body }) => {
      const rule = findRule(params['id'] ?? '');
      // Same order as the API: the account, the category, the new tags, then the rule's own checks.
      if (body.accountId) findAccount(db, body.accountId);
      const nextCategoryId = body.categoryId === undefined ? rule.categoryId : body.categoryId;
      const category = nextCategoryId ? findCategory(db, nextCategoryId) : null;
      const newTags = [
        ...new Set((body.tagIds ?? []).filter((id) => !rule.tagIds.includes(id))),
      ].map((tagId) => findTag(db, tagId));
      const next = {
        descriptionContains:
          body.descriptionContains === undefined
            ? rule.descriptionContains
            : body.descriptionContains,
        counterpartyContains:
          body.counterpartyContains === undefined
            ? rule.counterpartyContains
            : body.counterpartyContains,
        kind: body.kind === undefined ? rule.kind : body.kind,
        accountId: body.accountId === undefined ? rule.accountId : body.accountId,
        amountMinCents:
          body.amountMinCents === undefined ? rule.amountMinCents : body.amountMinCents,
        amountMaxCents:
          body.amountMaxCents === undefined ? rule.amountMaxCents : body.amountMaxCents,
        categoryId: nextCategoryId,
        tagIds: body.tagIds === undefined ? rule.tagIds : [...new Set(body.tagIds)],
      };
      if (next.descriptionContains === null && next.counterpartyContains === null)
        fail(400, 'VALIDATION_FAILED', 'Informe a descrição ou quem mandou ou recebeu');
      if (!next.categoryId && next.tagIds.length === 0)
        fail(422, 'RULE_ACTION_REQUIRED', 'Escolha uma categoria ou uma tag');
      // The kind is checked whenever it or the category is in play, also when only `kind` changes.
      if (category && next.kind && next.kind !== category.kind)
        fail(422, 'RULE_CATEGORY_KIND_MISMATCH', 'Tipo diferente do da categoria');
      // The category the rule already had may be archived by now; only a newly chosen one is refused.
      if (category?.archivedAt && category.id !== rule.categoryId)
        fail(422, 'RULE_CATEGORY_ARCHIVED', 'Categoria arquivada');
      if (newTags.some((tag) => tag.archivedAt)) fail(422, 'RULE_TAG_ARCHIVED', 'Tag arquivada');
      const duplicate = db.rules.some(
        (other) =>
          other.id !== rule.id &&
          other.descriptionContains === next.descriptionContains &&
          other.counterpartyContains === next.counterpartyContains &&
          other.kind === next.kind &&
          other.accountId === next.accountId &&
          other.amountMinCents === next.amountMinCents &&
          other.amountMaxCents === next.amountMaxCents,
      );
      if (duplicate) fail(409, 'RULE_DUPLICATE', 'Já existe regra com essa condição');
      Object.assign(rule, next, { enabled: body.enabled ?? rule.enabled, updatedAt: NOW_ISO });

      return presentRule(db, rule);
    }),
  ),

  http.post(
    '/api/rules/:id/apply',
    handleRoute({ response: applyRuleResultSchema }, ({ params }) => {
      const rule = findRule(params['id'] ?? '');
      if (!rule.enabled) fail(422, 'RULE_DISABLED', 'A regra está desligada');
      if (rule.categoryId && findCategory(db, rule.categoryId).archivedAt)
        fail(422, 'RULE_CATEGORY_ARCHIVED', 'Categoria arquivada');

      return applyRule(db, rule);
    }),
  ),

  http.delete(
    '/api/rules/:id',
    handleRoute({}, ({ params }) => {
      const rule = findRule(params['id'] ?? '');
      for (const tx of db.transactions) if (tx.categoryRuleId === rule.id) tx.categoryRuleId = null;
      db.rules = db.rules.filter((item) => item.id !== rule.id);
    }),
  ),
];
