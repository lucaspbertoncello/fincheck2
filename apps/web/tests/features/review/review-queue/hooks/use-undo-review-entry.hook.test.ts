import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { useReviewQueue } from '#/domain/transactions/review-queue/hooks/use-review-queue.hook.ts';
import { useUndoReviewEntry } from '#/features/review/review-queue/hooks/use-undo-review-entry.hook.ts';
import type { ReviewedEntry } from '#/features/review/review-queue/review-queue.type.ts';
import { server } from '#mocks/setup/server.util.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

function entryWith(item: ReviewQueue.ItemDto, overrides: Partial<ReviewedEntry> = {}) {
  const entry: ReviewedEntry = {
    item,
    categoryId: 'cat-1',
    tags: [],
    ruleId: null,
    historyPrevious: [],
    ...overrides,
  };
  return entry;
}

async function setup() {
  const onUndone = vi.fn();
  const onError = vi.fn();
  const { wrapper } = createQueryWrapper();
  const { result } = renderHook(
    () => ({
      queue: useReviewQueue({ month: '2026-10' }),
      undo: useUndoReviewEntry({ onUndone, onError }),
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.queue.isSuccess).toBe(true));
  return { result, item: result.current.queue.data!.items[0]!, onUndone, onError };
}

describe('useUndoReviewEntry', () => {
  it('clears the category, keeps the tags and tells it was undone', async () => {
    const bodies: unknown[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH')
        void request
          .clone()
          .json()
          .then((body) => bodies.push(body));
    });
    const { result, item, onUndone, onError } = await setup();
    const entry = entryWith(item);

    await act(async () => {
      await result.current.undo(entry);
    });

    server.events.removeAllListeners();
    expect(bodies).toEqual([{ categoryId: null, tagIds: item.transaction.tagIds }]);
    expect(onUndone).toHaveBeenCalledWith(entry);
    expect(onError).not.toHaveBeenCalled();
  });

  it('deletes the rule the save created before clearing the category', async () => {
    const calls: string[] = [];
    server.use(
      http.delete('/api/rules/:id', ({ params }) => {
        calls.push(`delete rule ${String(params['id'])}`);
        return new HttpResponse(null, { status: 204 });
      }),
      http.patch('/api/transactions/:id', () => {
        calls.push('patch');
        return HttpResponse.json({ code: 'STOP', message: 'parou' }, { status: 400 });
      }),
    );
    const { result, item } = await setup();

    await act(async () => {
      await result.current.undo(entryWith(item, { ruleId: 'rule-1' }));
    });

    expect(calls).toEqual(['delete rule rule-1', 'patch']);
  });

  it('tells the failure and does not report it as undone', async () => {
    server.use(
      http.patch('/api/transactions/:id', () =>
        HttpResponse.json({ code: 'TRANSACTION_NOT_FOUND', message: 'Sumiu' }, { status: 404 }),
      ),
    );
    const { result, item, onUndone, onError } = await setup();

    await act(async () => {
      await result.current.undo(entryWith(item));
    });

    expect(onUndone).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Sumiu');
  });
});
