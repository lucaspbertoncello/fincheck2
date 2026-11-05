import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSpendMapPeriod } from '#/features/profile/profile/hooks/use-spend-map-period.hook.ts';
import { FIXED_NOW } from '#tests/support/clock/fixed-now.constant.ts';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSpendMapPeriod', () => {
  it('starts on the current year, with the next arrow stopped', () => {
    const { result } = renderHook(() => useSpendMapPeriod());

    expect(result.current.period).toEqual({ mode: 'year', month: '2026-10' });
    expect(result.current.isCurrent).toBe(true);
  });

  it('goes back a year and forward again, and stops at the current one', () => {
    const { result } = renderHook(() => useSpendMapPeriod());

    act(() => result.current.goToPrevious());
    expect(result.current.period.month).toBe('2025-10');
    expect(result.current.isCurrent).toBe(false);

    act(() => result.current.goToNext());
    act(() => result.current.goToNext());
    expect(result.current.period.month).toBe('2026-10');
    expect(result.current.isCurrent).toBe(true);
  });

  it('keeps where the person was when switching between month and year', () => {
    const { result } = renderHook(() => useSpendMapPeriod());

    act(() => result.current.goToPrevious());
    act(() => result.current.setMode('month'));
    expect(result.current.period).toEqual({ mode: 'month', month: '2025-10' });

    act(() => result.current.goToPrevious());
    act(() => result.current.setMode('year'));
    expect(result.current.period).toEqual({ mode: 'year', month: '2025-09' });
  });
});
