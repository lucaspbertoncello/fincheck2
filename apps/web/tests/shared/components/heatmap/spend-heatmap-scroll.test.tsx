import { SpendHeatmap } from '@fincheck/ui';
import type { SpendHeatmapDay } from '@fincheck/ui';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

function makeDays(count: number): SpendHeatmapDay[] {
  const start = Date.UTC(2025, 10, 2);
  return Array.from({ length: count }, (_, index) => ({
    date: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
    level: 0,
    totalCents: 0,
  }));
}

const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get');

afterEach(() => {
  scrollWidth.mockReset();
  vi.unstubAllGlobals();
});

describe('SpendHeatmap opening position', () => {
  it('opens scrolled to the current week, the right edge of the map', () => {
    scrollWidth.mockReturnValue(1056);

    render(<SpendHeatmap days={makeDays(365)} label="Mapa" onSelectDay={() => undefined} />);

    const scroller = screen.getByRole('grid').closest('.overflow-x-auto');
    expect(scroller?.scrollLeft).toBe(1056);
  });

  it('goes to the end again when the scroller only gets its width later, until the person moves it', () => {
    scrollWidth.mockReturnValue(0);
    let notify: () => void = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );

    render(<SpendHeatmap days={makeDays(365)} label="Mapa" onSelectDay={() => undefined} />);
    const scroller = screen.getByRole('grid').closest('.overflow-x-auto') as HTMLElement;
    expect(scroller.scrollLeft).toBe(0);

    scrollWidth.mockReturnValue(1056);
    act(() => notify());
    expect(scroller.scrollLeft).toBe(1056);

    act(() => {
      scroller.dispatchEvent(new Event('touchstart'));
    });
    scrollWidth.mockReturnValue(2000);
    scroller.scrollLeft = 300;
    act(() => notify());
    expect(scroller.scrollLeft).toBe(300);
  });
});
