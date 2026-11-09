import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const MISSING = '0194f3a0-0000-7000-8000-999999999999';
const ARCHIVED_AT = '2026-01-01T00:00:00.000Z';

function category(kind: 'expense' | 'income', index = 0): string {
  return db.categories.filter((item) => item.kind === kind && !item.archivedAt)[index]?.id ?? '';
}

// A tag of a category: the tags of a rule are the ones of the category it puts.
function addTag(categoryId: string, name: string): string {
  const id = `0194f3a0-0000-7000-8000-${String(db.tags.length + 100).padStart(12, '0')}`;
  db.tags.push({ id, categoryId, name, archivedAt: null });

  return id;
}

function addTransaction(
  description: string,
  extra: Partial<MockState.TransactionRecord> = {},
): MockState.TransactionRecord {
  const record = makeTransactionRecord({
    accountId: db.accounts.find((account) => account.type === 'checking')?.id ?? '',
    method: 'pix',
    description,
    amountCents: -2000,
    occurredOn: TODAY,
  });
  Object.assign(record, extra);
  db.transactions.push(record);

  return record;
}

async function createRule(body: Record<string, unknown>) {
  const answer = await callApi('POST', '/rules', body);
  expect(answer.status).toBe(201);

  return (answer.json as { rule: { id: string } }).rule.id;
}

function codeOf(answer: { json: unknown }) {
  return apiErrorSchema.parse(answer.json).code;
}

describe('rule on the history: what is put by hand stays (mock vs api 20, 38, 40)', () => {
  it('does not touch what Lucas, a recurrence or a bill categorized, not even the tags', async () => {
    const tag = addTag(category('expense', 4), 'da-regra');
    const mine = addTransaction('LOJA RULETA', {
      categoryId: category('expense', 1),
      categorySource: 'user',
    });
    const recurrence = addTransaction('LOJA RULETA', {
      categoryId: category('expense', 2),
      categorySource: 'recurrence',
    });
    const bill = addTransaction('LOJA RULETA', {
      categoryId: category('expense', 3),
      categorySource: 'bill',
    });
    const free = addTransaction('LOJA RULETA');

    await createRule({
      descriptionContains: 'LOJA RULETA',
      categoryId: category('expense', 4),
      tagIds: [tag],
      applyToHistory: true,
    });

    expect([mine, recurrence, bill].map((tx) => tx.tagIds)).toEqual([[], [], []]);
    expect(mine.categoryId).toBe(category('expense', 1));
    expect(free).toMatchObject({ categoryId: category('expense', 4), categorySource: 'rule' });
    expect(free.tagIds).toEqual([tag]);
  });

  it('a rule with its category and tags is no change for a transaction put by hand, in the preview and in the apply', async () => {
    const tag = addTag(category('expense', 4), 'da-regra');
    const mine = addTransaction('LOJA SOTAGS', {
      categoryId: category('expense', 1),
      categorySource: 'user',
    });
    const free = addTransaction('LOJA SOTAGS');
    const body = {
      descriptionContains: 'LOJA SOTAGS',
      categoryId: category('expense', 4),
      tagIds: [tag],
    };

    const preview = await callApi('POST', '/rules/preview', body);
    expect(preview.json).toMatchObject({ matchCount: 2, willChangeCount: 1 });

    const id = await createRule(body);
    const applied = await callApi('POST', `/rules/${id}/apply`);

    expect(applied.json).toMatchObject({ changedCount: 1 });
    expect(mine.tagIds).toEqual([]);
    expect(free.tagIds).toEqual([tag]);
  });

  it('a rule takes the tags of the old category off and puts the ones of its own', async () => {
    const oldCategory = category('expense', 1);
    const oldTag = addTag(oldCategory, 'antiga');
    const newCategory = category('expense', 4);
    const newTag = addTag(newCategory, 'nova');
    const record = addTransaction('LOJA TROCA', {
      categoryId: oldCategory,
      categorySource: 'rule',
      tagIds: [oldTag],
    });
    const id = await createRule({
      descriptionContains: 'LOJA TROCA',
      categoryId: newCategory,
      tagIds: [newTag],
    });

    await callApi('POST', `/rules/${id}/apply`);

    expect(record).toMatchObject({ categoryId: newCategory, tagIds: [newTag] });
  });

  it('refuses a tag of another category and any tag on a rule with no category (422)', async () => {
    const tag = addTag(category('expense', 1), 'de-outra');
    const other = await callApi('POST', '/rules', {
      descriptionContains: 'LOJA X',
      categoryId: category('expense', 4),
      tagIds: [tag],
    });
    const none = await callApi('POST', '/rules', { descriptionContains: 'LOJA Y', tagIds: [tag] });

    expect([other.status, none.status]).toEqual([422, 422]);
    expect([codeOf(other), codeOf(none)]).toEqual([
      'RULE_TAG_CATEGORY_MISMATCH',
      'RULE_TAG_CATEGORY_MISMATCH',
    ]);
  });

  it('does not add a tag that was archived after the rule was made', async () => {
    const tag = addTag(category('expense', 1), 'a');
    const kept = addTag(category('expense', 1), 'b');
    const id = await createRule({
      descriptionContains: 'LOJA ARQUIVADA',
      categoryId: category('expense', 1),
      tagIds: [tag, kept],
    });
    const record = addTransaction('LOJA ARQUIVADA');
    const found = db.tags.find((item) => item.id === tag);
    if (found) found.archivedAt = ARCHIVED_AT;

    const applied = await callApi('POST', `/rules/${id}/apply`);

    expect(applied.json).toMatchObject({ changedCount: 1 });
    expect(record.tagIds).toEqual([kept]);
  });

  it('still puts the category, with no tag, when the only tag of the rule is archived', async () => {
    const tag = addTag(category('expense', 1), 'a');
    const id = await createRule({
      descriptionContains: 'LOJA SEMTAG',
      categoryId: category('expense', 1),
      tagIds: [tag],
    });
    const record = addTransaction('LOJA SEMTAG');
    const found = db.tags.find((item) => item.id === tag);
    if (found) found.archivedAt = ARCHIVED_AT;

    const applied = await callApi('POST', `/rules/${id}/apply`);

    expect(applied.json).toMatchObject({ changedCount: 1 });
    expect(record).toMatchObject({ categoryId: category('expense', 1), tagIds: [] });
  });
});

describe('rule preview: the references (mock vs api 23)', () => {
  it('answers 404 for a tag and an account that do not exist', async () => {
    const tag = await callApi('POST', '/rules/preview', {
      descriptionContains: 'X1',
      categoryId: category('expense'),
      tagIds: [MISSING],
    });
    const account = await callApi('POST', '/rules/preview', {
      descriptionContains: 'X1',
      categoryId: category('expense'),
      accountId: MISSING,
    });

    expect([tag.status, account.status]).toEqual([404, 404]);
    expect([codeOf(tag), codeOf(account)]).toEqual(['TAG_NOT_FOUND', 'ACCOUNT_NOT_FOUND']);
  });
});

describe('rule edit: the checks of the api (mock vs api 22, 35, 36)', () => {
  async function newRule(extra: Record<string, unknown> = {}) {
    return createRule({
      descriptionContains: 'EDITAVEL',
      categoryId: category('expense', 1),
      ...extra,
    });
  }

  it('answers 404 for an account, a category and a tag that do not exist', async () => {
    const id = await newRule();

    const account = await callApi('PATCH', `/rules/${id}`, { accountId: MISSING });
    const categoryAnswer = await callApi('PATCH', `/rules/${id}`, { categoryId: MISSING });
    const tag = await callApi('PATCH', `/rules/${id}`, { tagIds: [MISSING] });

    expect(account.status).toBe(404);
    expect([codeOf(account), codeOf(categoryAnswer), codeOf(tag)]).toEqual([
      'ACCOUNT_NOT_FOUND',
      'CATEGORY_NOT_FOUND',
      'TAG_NOT_FOUND',
    ]);
  });

  it('checks the kind against the category also when only the kind changes', async () => {
    const id = await newRule();

    const answer = await callApi('PATCH', `/rules/${id}`, { kind: 'income' });

    expect(answer.status).toBe(422);
    expect(codeOf(answer)).toBe('RULE_CATEGORY_KIND_MISMATCH');
  });

  it('accepts the archived category the rule already had, and refuses a new archived one', async () => {
    const id = await newRule();
    const archived = db.categories.find((item) => item.kind === 'expense' && item.archivedAt);
    const own = db.categories.find((item) => item.id === category('expense', 1));
    if (own) own.archivedAt = ARCHIVED_AT;

    const same = await callApi('PATCH', `/rules/${id}`, {
      categoryId: own?.id,
      descriptionContains: 'EDITAVEL 2',
    });
    expect(same.status).toBe(200);

    const other = await callApi('PATCH', `/rules/${id}`, { categoryId: archived?.id });
    expect(other.status).toBe(422);
    expect(codeOf(other)).toBe('RULE_CATEGORY_ARCHIVED');
  });

  it('refuses a new tag that is archived, and keeps an old one that is archived now', async () => {
    const firstId = addTag(category('expense', 1), 'a');
    const secondId = addTag(category('expense', 1), 'b');
    const first = db.tags.find((item) => item.id === firstId);
    const second = db.tags.find((item) => item.id === secondId);
    const id = await newRule({ tagIds: [first?.id] });
    if (first) first.archivedAt = ARCHIVED_AT;
    if (second) second.archivedAt = ARCHIVED_AT;

    const kept = await callApi('PATCH', `/rules/${id}`, { tagIds: [first?.id], enabled: false });
    expect(kept.status).toBe(200);

    const added = await callApi('PATCH', `/rules/${id}`, { tagIds: [first?.id, second?.id] });
    expect(added.status).toBe(422);
    expect(codeOf(added)).toBe('RULE_TAG_ARCHIVED');
  });
});
