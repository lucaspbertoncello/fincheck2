import { SpendHeatmap } from '@fincheck/ui';
import type { SpendHeatmapDay } from '@fincheck/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// 2026-11-09 is a Monday; the other days are empty.
const DAYS: SpendHeatmapDay[] = ['2026-11-08', '2026-11-09', '2026-11-10'].map((date) => ({
  date,
  level: date === '2026-11-09' ? 2 : 0,
  totalCents: date === '2026-11-09' ? 2002 : 0,
}));

function rectAt(top: number): DOMRect {
  return { top, bottom: top + 12, left: 400, right: 412, width: 12, height: 12 } as DOMRect;
}

afterEach(() => vi.restoreAllMocks());

describe.each(['year', 'month'] as const)('SpendHeatmap tip (%s view)', (view) => {
  function renderMap() {
    return render(
      <SpendHeatmap
        view={view}
        days={DAYS}
        label="Gasto por dia"
        today="2026-11-10"
        onSelectDay={() => undefined}
      />,
    );
  }

  it('shows value and short date on one line, drawn on the body and not inside the map', () => {
    const { container } = renderMap();

    fireEvent.mouseEnter(screen.getByRole('button', { name: /R\$ 20,02/ }));

    const tip = screen.getByText('seg., 9 nov.').parentElement as HTMLElement;
    expect(tip.textContent).toBe('R$ 20,02 · seg., 9 nov.');
    expect(tip.parentElement).toBe(document.body);
    expect(container.contains(tip)).toBe(false);
    expect(tip).toHaveClass('whitespace-nowrap');
    expect(tip).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens over the day when there is room above it, and under it when there is not', () => {
    renderMap();
    const day = screen.getByRole('button', { name: /R\$ 20,02/ });
    const rect = vi.spyOn(day, 'getBoundingClientRect');

    rect.mockReturnValue(rectAt(300));
    fireEvent.mouseEnter(day);
    expect(screen.getByText('seg., 9 nov.').parentElement).toHaveAttribute('data-side', 'top');

    fireEvent.mouseLeave(screen.getByRole('grid'));
    expect(screen.queryByText('seg., 9 nov.')).not.toBeInTheDocument();

    rect.mockReturnValue(rectAt(4));
    fireEvent.mouseEnter(day);
    expect(screen.getByText('seg., 9 nov.').parentElement).toHaveAttribute('data-side', 'bottom');
  });

  it('shows the tip on keyboard focus too and hides it on Escape', () => {
    renderMap();

    fireEvent.focus(screen.getByRole('button', { name: /R\$ 20,02/ }));
    expect(screen.getByText('seg., 9 nov.')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('grid'), { key: 'Escape' });
    expect(screen.queryByText('seg., 9 nov.')).not.toBeInTheDocument();
  });

  it('hides the tip when its day left the page', () => {
    const { rerender } = renderMap();
    fireEvent.mouseEnter(screen.getByRole('button', { name: /R\$ 20,02/ }));
    expect(screen.getByText('seg., 9 nov.').parentElement).toHaveStyle({ visibility: 'visible' });

    rerender(
      <SpendHeatmap
        view={view}
        days={DAYS.filter((day) => day.date !== '2026-11-09')}
        label="Gasto por dia"
        today="2026-11-10"
        onSelectDay={() => undefined}
      />,
    );

    expect(screen.getByText('seg., 9 nov.').parentElement).toHaveStyle({ visibility: 'hidden' });
  });

  it('says "Sem gastos" for an empty day', () => {
    renderMap();

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Sem gastos, domingo/ }));

    expect(screen.getByText('dom., 8 nov.').parentElement?.textContent).toBe(
      'Sem gastos · dom., 8 nov.',
    );
  });
});
