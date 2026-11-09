import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollToMissingFilter } from '#/features/recurrences/recurrence-list/hooks/use-scroll-to-missing-filter.hook.ts';

// The scroll waits for the layout to settle (the chip opens, the lines leave): a smooth scroll
// started in the middle of that is cancelled by the browser.
const SETTLE_MS = 400;

describe('useScrollToMissingFilter', () => {
  const scrollIntoView = vi.fn();
  const element = Object.assign(document.createElement('div'), { scrollIntoView });

  function render(initial: { isActive: boolean; isReady: boolean }) {
    const view = renderHook((props) => useScrollToMissingFilter(props.isActive, props.isReady), {
      initialProps: initial,
    });
    view.result.current.current = element;

    return view;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not scroll before the layout settles, and scrolls once after', () => {
    render({ isActive: true, isReady: true });

    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(scrollIntoView).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    expect(scrollIntoView.mock.contexts[0]).toBe(element);

    vi.advanceTimersByTime(5_000);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does not scroll again when it renders again with the filter still on', () => {
    const view = render({ isActive: true, isReady: true });
    vi.advanceTimersByTime(SETTLE_MS);

    view.rerender({ isActive: true, isReady: true });
    view.rerender({ isActive: true, isReady: false });
    view.rerender({ isActive: true, isReady: true });
    vi.advanceTimersByTime(SETTLE_MS * 2);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does not scroll when the filter is cleared before the scroll fires', () => {
    const view = render({ isActive: true, isReady: true });
    vi.advanceTimersByTime(SETTLE_MS - 100);

    view.rerender({ isActive: false, isReady: true });
    vi.advanceTimersByTime(SETTLE_MS * 2);

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('waits for the content to be on screen, then counts the delay from there', () => {
    const view = render({ isActive: true, isReady: false });
    vi.advanceTimersByTime(SETTLE_MS * 2);
    expect(scrollIntoView).not.toHaveBeenCalled();

    view.rerender({ isActive: true, isReady: true });
    vi.advanceTimersByTime(SETTLE_MS - 1);
    expect(scrollIntoView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('scrolls again only after the filter was cleared and came back', () => {
    const view = render({ isActive: true, isReady: true });
    vi.advanceTimersByTime(SETTLE_MS);
    view.rerender({ isActive: false, isReady: true });
    view.rerender({ isActive: true, isReady: true });
    vi.advanceTimersByTime(SETTLE_MS);

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('goes without the glide with "reduzir movimento"', () => {
    const original = Reflect.get(window, 'matchMedia') as unknown;
    Reflect.set(window, 'matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
    }));
    try {
      render({ isActive: true, isReady: true });
      vi.advanceTimersByTime(SETTLE_MS);

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
    } finally {
      Reflect.set(window, 'matchMedia', original);
    }
  });

  it('reads the target when it fires: an element that was not there when it was scheduled is used', () => {
    const view = renderHook((props) => useScrollToMissingFilter(props.isActive, props.isReady), {
      initialProps: { isActive: true, isReady: true },
    });
    vi.advanceTimersByTime(SETTLE_MS - 10);
    view.result.current.current = element;
    vi.advanceTimersByTime(10);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
