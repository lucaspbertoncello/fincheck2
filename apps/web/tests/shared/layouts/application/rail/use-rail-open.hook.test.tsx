import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RAIL_CLOSE_DELAY_MS,
  RAIL_OPEN_DELAY_MS,
} from '#/shared/layouts/application/rail/rail-timing.constant.ts';
import { useRailOpen } from '#/shared/layouts/application/rail/use-rail-open.hook.ts';

function Harness() {
  const { open, railProps, setMenuOpen } = useRailOpen();
  return (
    <nav aria-label="rail" data-open={open ? '' : undefined} {...railProps}>
      <a href="#a">A</a>
      <button onClick={() => setMenuOpen(true)}>open menu</button>
      <button onClick={() => setMenuOpen(false)}>close menu</button>
    </nav>
  );
}

const rail = () => screen.getByRole('navigation', { name: 'rail' });
function tick(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

const isOpen = () => rail().hasAttribute('data-open');

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useRailOpen', () => {
  it('opens only after the pointer has rested on the rail for the open delay', () => {
    render(<Harness />);

    fireEvent.pointerEnter(rail(), { pointerType: 'mouse' });
    tick(RAIL_OPEN_DELAY_MS - 1);
    expect(isOpen()).toBe(false);

    tick(1);
    expect(isOpen()).toBe(true);
  });

  it('does not open when the pointer only crosses the rail', () => {
    render(<Harness />);

    fireEvent.pointerEnter(rail(), { pointerType: 'mouse' });
    tick(RAIL_OPEN_DELAY_MS - 20);
    fireEvent.pointerLeave(rail());
    tick(RAIL_CLOSE_DELAY_MS + RAIL_OPEN_DELAY_MS);

    expect(isOpen()).toBe(false);
  });

  it('waits longer to close than to open, and a pointer that comes back keeps it open', () => {
    expect(RAIL_CLOSE_DELAY_MS).toBeGreaterThan(RAIL_OPEN_DELAY_MS);
    render(<Harness />);
    fireEvent.pointerEnter(rail(), { pointerType: 'mouse' });
    tick(RAIL_OPEN_DELAY_MS);

    fireEvent.pointerLeave(rail());
    tick(RAIL_CLOSE_DELAY_MS - 1);
    expect(isOpen()).toBe(true);

    fireEvent.pointerEnter(rail(), { pointerType: 'mouse' });
    tick(RAIL_CLOSE_DELAY_MS * 2);
    expect(isOpen()).toBe(true);

    fireEvent.pointerLeave(rail());
    tick(RAIL_CLOSE_DELAY_MS);
    expect(isOpen()).toBe(false);
  });

  it('ignores a touch, which has no hover', () => {
    render(<Harness />);

    fireEvent.pointerEnter(rail(), { pointerType: 'touch' });
    tick(RAIL_OPEN_DELAY_MS * 3);

    expect(isOpen()).toBe(false);
  });

  it('stays open while the "+" menu is open, even with the pointer gone', () => {
    render(<Harness />);
    fireEvent.pointerEnter(rail(), { pointerType: 'mouse' });
    tick(RAIL_OPEN_DELAY_MS);

    fireEvent.click(screen.getByText('open menu'));
    fireEvent.pointerLeave(rail());
    tick(RAIL_CLOSE_DELAY_MS * 3);
    expect(isOpen()).toBe(true);

    // jsdom has no real :hover.
    const element = rail();
    const matches = element.matches.bind(element);
    vi.spyOn(element, 'matches').mockImplementation((selector) =>
      selector === ':hover' ? false : matches(selector),
    );
    fireEvent.click(screen.getByText('close menu'));
    tick(RAIL_CLOSE_DELAY_MS);
    expect(isOpen()).toBe(false);
  });

  it('opens at once when the keyboard focuses a link, and closes when focus leaves', () => {
    render(<Harness />);
    const link = screen.getByRole('link', { name: 'A' });
    const matches = vi
      .spyOn(link, 'matches')
      .mockImplementation((selector) => selector === ':focus-visible');

    fireEvent.focus(link);
    expect(isOpen()).toBe(true);

    fireEvent.blur(link, { relatedTarget: document.body });
    tick(RAIL_CLOSE_DELAY_MS);
    expect(isOpen()).toBe(false);
    matches.mockRestore();
  });

  it('does not open for the focus of a click', () => {
    render(<Harness />);
    const link = screen.getByRole('link', { name: 'A' });
    vi.spyOn(link, 'matches').mockReturnValue(false);

    fireEvent.focus(link);
    tick(RAIL_OPEN_DELAY_MS * 3);

    expect(isOpen()).toBe(false);
  });
});
