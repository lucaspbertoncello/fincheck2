import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from '#/features/rules/hooks/use-debounced-value.hook.ts';
import { useDeferredDeletion } from '#/features/rules/hooks/use-deferred-deletion.hook.ts';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useDeferredDeletion', () => {
  it('hides the id at once and runs the delete when the time is up', async () => {
    const commit = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useDeferredDeletion(6000));

    act(() => result.current.schedule('r1', commit, vi.fn()));
    expect(result.current.pendingIds).toEqual(['r1']);
    expect(commit).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(result.current.pendingIds).toEqual([]);
  });

  it('brings the id back and never deletes when cancelled in time', async () => {
    const commit = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() => useDeferredDeletion(6000));
    act(() => result.current.schedule('r1', commit, vi.fn()));

    let cancelled = false;
    act(() => {
      cancelled = result.current.cancel('r1');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(cancelled).toBe(true);
    expect(commit).not.toHaveBeenCalled();
    expect(result.current.pendingIds).toEqual([]);
  });

  it('says it was too late once the delete went out, and reports a failed delete', async () => {
    const onFailure = vi.fn();
    const { result } = renderHook(() => useDeferredDeletion(1000));
    act(() => result.current.schedule('r1', () => Promise.reject(new Error('x')), onFailure));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    let cancelled = true;
    act(() => {
      cancelled = result.current.cancel('r1');
    });

    expect(cancelled).toBe(false);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(result.current.pendingIds).toEqual([]);
  });

  it('runs what is still waiting when the screen is left', () => {
    const commit = vi.fn(() => Promise.resolve());
    const { result, unmount } = renderHook(() => useDeferredDeletion(6000));
    act(() => result.current.schedule('r1', commit, vi.fn()));

    unmount();

    expect(commit).toHaveBeenCalledTimes(1);
  });
});

describe('useDebouncedValue', () => {
  it('follows the value only after it stopped changing', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    rerender({ value: 'abc' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('abc');
  });
});
