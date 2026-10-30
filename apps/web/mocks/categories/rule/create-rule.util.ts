import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { findTag } from '#mocks/categories/tag/find-tag.util.ts';
import { applyRule } from '#mocks/categories/rule/apply-rule.util.ts';
import { presentRule } from '#mocks/categories/rule/present-rule.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW_ISO } from '#mocks/support/dates/clock.constant.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

interface NewRule {
  descriptionContains: string;
  kind?: 'expense' | 'income' | undefined;
  accountId?: string | undefined;
  amountMinCents?: number | undefined;
  amountMaxCents?: number | undefined;
  categoryId?: string | undefined;
  tagIds?: string[] | undefined;
  applyToHistory?: boolean | undefined;
}

// Creates a rule with the checks of POST /rules; all or nothing.
export function createRule(database: MockState.Database, input: NewRule): Rule.CreateResult {
  const tagIds = input.tagIds ?? [];
  if (!input.categoryId && tagIds.length === 0)
    fail(422, 'RULE_ACTION_REQUIRED', 'Escolha uma categoria ou uma tag');
  if (input.categoryId) {
    const category = findCategory(database, input.categoryId);
    if (input.kind && input.kind !== category.kind)
      fail(422, 'RULE_CATEGORY_KIND_MISMATCH', 'Tipo diferente do da categoria');
    if (category.archivedAt) fail(422, 'RULE_CATEGORY_ARCHIVED', 'Categoria arquivada');
  }
  for (const tagId of tagIds) {
    if (findTag(database, tagId).archivedAt) fail(422, 'RULE_TAG_ARCHIVED', 'Tag arquivada');
  }
  if (input.accountId && !database.accounts.some((account) => account.id === input.accountId)) {
    fail(404, 'ACCOUNT_NOT_FOUND', 'A conta não existe');
  }
  const duplicate = database.rules.some(
    (rule) =>
      rule.descriptionContains === input.descriptionContains &&
      rule.kind === (input.kind ?? null) &&
      rule.accountId === (input.accountId ?? null) &&
      rule.amountMinCents === (input.amountMinCents ?? null) &&
      rule.amountMaxCents === (input.amountMaxCents ?? null),
  );
  if (duplicate) fail(409, 'RULE_DUPLICATE', 'Já existe regra com essa condição');

  const record: MockState.RuleRecord = {
    id: newId(),
    descriptionContains: input.descriptionContains,
    kind: input.kind ?? null,
    accountId: input.accountId ?? null,
    amountMinCents: input.amountMinCents ?? null,
    amountMaxCents: input.amountMaxCents ?? null,
    categoryId: input.categoryId ?? null,
    tagIds,
    enabled: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
  database.rules.push(record);
  const applied = input.applyToHistory ? applyRule(database, record) : null;

  return { rule: presentRule(database, record), applied };
}
