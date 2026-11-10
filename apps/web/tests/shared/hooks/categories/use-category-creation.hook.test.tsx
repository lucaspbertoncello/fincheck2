import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCategoryCreation } from '#/shared/hooks/categories/use-category-creation.hook.ts';

describe('useCategoryCreation', () => {
  it('starts closed', () => {
    const { result } = renderHook(() =>
      useCategoryCreation({ kind: 'expense', onCreated: vi.fn() }),
    );

    expect(result.current.formProps.target).toBeNull();
  });

  it('opens the modal to create a category of the kind, with the typed name and the type fixed', () => {
    const { result } = renderHook(() =>
      useCategoryCreation({ kind: 'income', onCreated: vi.fn() }),
    );

    act(() => result.current.open('Freela'));

    expect(result.current.formProps.target).toEqual({
      mode: 'create',
      kind: 'income',
      name: 'Freela',
      subtitle: undefined,
      lockKind: true,
    });
  });

  it('opens with an empty name from the fixed "Nova categoria" line', () => {
    const { result } = renderHook(() =>
      useCategoryCreation({ kind: 'expense', onCreated: vi.fn() }),
    );

    act(() => result.current.open(''));

    expect(result.current.formProps.target).toMatchObject({ mode: 'create', name: '' });
  });

  it('leaves the type free and carries the subtitle when both kinds fit (a credit on a card)', () => {
    const { result } = renderHook(() =>
      useCategoryCreation({
        kind: 'expense',
        lockKind: false,
        subtitle: 'Despesa abate o gasto.',
        onCreated: vi.fn(),
      }),
    );

    act(() => result.current.open('Estorno'));

    expect(result.current.formProps.target).toMatchObject({
      kind: 'expense',
      lockKind: false,
      subtitle: 'Despesa abate o gasto.',
    });
  });

  it('closes on onClose, and hands the created category to the field', () => {
    const onCreated = vi.fn();
    const { result } = renderHook(() => useCategoryCreation({ kind: 'expense', onCreated }));
    const created = { id: 'new', name: 'Pets' } as Category.Dto;

    act(() => result.current.open('Pets'));
    act(() => result.current.formProps.onCreated(created));
    act(() => result.current.formProps.onClose());

    expect(onCreated).toHaveBeenCalledWith(created);
    expect(result.current.formProps.target).toBeNull();
  });
});
