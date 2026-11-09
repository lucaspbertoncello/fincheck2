import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useReviewQueue } from '#/domain/transactions/review-queue/hooks/use-review-queue.hook.ts';
import type { ReviewedEntry } from '#/features/review/review-queue/review-queue.type.ts';
import { useSaveReviewEntry } from '#/features/review/review-queue/hooks/use-save-review-entry.hook.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { server } from '#mocks/setup/server.util.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function setup() {
  const onError = vi.fn();
  const { wrapper } = createQueryWrapper();
  const { result } = renderHook(
    () => ({
      queue: useReviewQueue({ month: '2026-10' }),
      categories: useCategories({ status: 'active' }),
      save: useSaveReviewEntry({ onError }),
    }),
    { wrapper },
  );
  await waitFor(() => {
    expect(result.current.queue.isSuccess).toBe(true);
    expect(result.current.categories.isSuccess).toBe(true);
  });

  const item = result.current.queue.data!.items[0]!;
  const category = result.current.categories.data!.items.find(
    (candidate) => candidate.kind === 'expense',
  )!;
  const params = { item, categoryId: category.id, tagIds: [] as string[] };
  return { result, onError, params, category };
}

describe('useSaveReviewEntry', () => {
  it('saves the category and the tags of that category', async () => {
    const { result, onError, params, category } = await setup();
    const tagId = '019a5a00-0000-7000-8000-0000000000aa';
    db.tags.push({ id: tagId, categoryId: category.id, name: 'zzz-tag', archivedAt: null });

    let entry: ReviewedEntry | null | undefined;
    await act(async () => {
      entry = await result.current.save({ ...params, tagIds: [tagId], rule: null });
    });

    expect(entry).toMatchObject({
      categoryId: category.id,
      tagIds: [tagId],
      ruleId: null,
      historyPrevious: [],
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('creates the rule with the save and returns what it changed in the history', async () => {
    const { result, onError, params } = await setup();

    let entry: ReviewedEntry | null | undefined;
    await act(async () => {
      entry = await result.current.save({
        ...params,
        rule: { pattern: 'zzz-unique-pattern', kind: 'expense' },
      });
    });

    expect(entry?.ruleId).toEqual(expect.any(String));
    expect(onError).not.toHaveBeenCalled();
  });

  it('returns null and tells the failure when the transaction is not saved', async () => {
    const { result, onError, params } = await setup();
    server.use(
      http.patch('/api/transactions/:id', () =>
        HttpResponse.json({ code: 'TRANSACTION_NOT_FOUND', message: 'Sumiu' }, { status: 404 }),
      ),
    );

    let entry: ReviewedEntry | null | undefined;
    await act(async () => {
      entry = await result.current.save({ ...params, rule: null });
    });

    expect(entry).toBeNull();
    expect(onError).toHaveBeenCalledWith('Sumiu');
  });

  it('keeps the entry without a word when the same rule already exists', async () => {
    const { result, onError, params } = await setup();
    server.use(
      http.post('/api/rules', () =>
        HttpResponse.json({ code: 'RULE_DUPLICATE', message: 'dup' }, { status: 409 }),
      ),
    );

    let entry: ReviewedEntry | null | undefined;
    await act(async () => {
      entry = await result.current.save({
        ...params,
        rule: { pattern: 'zzz-unique-pattern', kind: 'expense' },
      });
    });

    expect(entry).toMatchObject({ ruleId: null });
    expect(onError).not.toHaveBeenCalled();
  });

  it('says the transaction was saved but the rule was not, on any other rule failure', async () => {
    const { result, onError, params } = await setup();
    server.use(
      http.post('/api/rules', () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Quebrou' }, { status: 500 }),
      ),
    );

    let entry: ReviewedEntry | null | undefined;
    await act(async () => {
      entry = await result.current.save({
        ...params,
        rule: { pattern: 'zzz-unique-pattern', kind: 'expense' },
      });
    });

    expect(entry).toMatchObject({ ruleId: null });
    expect(onError).toHaveBeenCalledWith('A transação foi salva, mas a regra não: Quebrou');
  });
});
