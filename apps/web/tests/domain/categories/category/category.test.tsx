import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useArchiveCategory } from '#/domain/categories/category/hooks/use-archive-category.hook.ts';
import { useCategories } from '#/domain/categories/category/hooks/use-categories.hook.ts';
import { useCreateCategory } from '#/domain/categories/category/hooks/use-create-category.hook.ts';
import { useRules } from '#/domain/categories/rule/hooks/use-rules.hook.ts';
import { useRuleSuggestions } from '#/domain/categories/rule-suggestion/hooks/use-rule-suggestions.hook.ts';
import { useTags } from '#/domain/categories/tag/hooks/use-tags.hook.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

describe('categories domain', () => {
  it('reads categories, tags and rules; rule suggestions stay idle without ids', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        categories: useCategories(),
        tags: useTags(),
        rules: useRules(),
        suggestions: useRuleSuggestions([]),
      }),
      { wrapper },
    );
    await waitFor(() => {
      expect(result.current.categories.isSuccess).toBe(true);
      expect(result.current.tags.isSuccess).toBe(true);
      expect(result.current.rules.isSuccess).toBe(true);
    });

    expect(result.current.categories.data?.items.length).toBeGreaterThan(0);
    expect(result.current.suggestions.fetchStatus).toBe('idle');
  });

  it('creates a category and archives it; the active list follows', async () => {
    const { wrapper } = createQueryWrapper();
    const { result } = renderHook(
      () => ({
        list: useCategories({ kind: 'expense' }),
        create: useCreateCategory(),
        archive: useArchiveCategory(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    let id = '';
    await act(async () => {
      const created = await result.current.create.mutateAsync({
        kind: 'expense',
        name: 'Aquário',
        icon: 'food',
      });
      id = created.id;
    });
    const listed = () => result.current.list.data?.items.some((item) => item.id === id);
    await waitFor(() => expect(listed()).toBe(true));

    await act(async () => {
      await result.current.archive.mutateAsync(id);
    });
    await waitFor(() => expect(listed()).toBe(false));
  });
});
