import { fireEvent, render, screen, within } from '@testing-library/react';
import type * as MotionReact from 'motion/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof MotionReact>()),
  useReducedMotion: () => motion.reduced,
}));

import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';
import { CardSection } from '#/features/accounts/account-list/components/card-section.component.tsx';
import type { CardBlockData } from '#/features/accounts/account-list/types/account-list.type.ts';

const NAMES = ['Roxinho', 'Black', 'Platinum', 'Gold', 'Infinite'];

function makeCard(index: number): CardBlockData {
  return {
    id: `card-${index}`,
    theme: 'nubank',
    nickname: NAMES[index] ?? `Cartão ${index}`,
    last4: String(1000 + index),
    dueLabel: 'Vence dia 6',
    invoice: {
      month: '2026-11',
      status: 'open',
      totalCents: 120_000 + index,
      dueLine: 'Fecha 30/10, vence 06/11',
      cycleProgress: 0.4,
      isEditable: true,
    },
    installments: [],
    menuItems: [],
  };
}

// A desktop track: two slides of 300 px and a 24 px gap in a 4 px padding on each side.
const SLIDE = 300;
const GAP = 24;
const PADDING = 4;
const layout = { clientWidth: 0, scrollWidth: 0 };
/** What one page moves: the two slides and the gap between them, past the second slide's gap. */
const PAGE_STEP = 2 * SLIDE + 2 * GAP;
let scrollLeft = 0;
const scrollBy = vi.fn();

function renderSection(count: number, onAddCard = vi.fn()) {
  layout.clientWidth = 2 * SLIDE + GAP + 2 * PADDING;
  layout.scrollWidth = count * SLIDE + (count - 1) * GAP + 2 * PADDING;
  const cards = Array.from({ length: count }, (_, index) => makeCard(index));
  render(
    <CardSection
      cards={cards}
      onAddCard={onAddCard}
      onViewInvoice={vi.fn()}
      onCorrectInvoice={vi.fn()}
      onOpenFuture={vi.fn()}
      onMenuAction={vi.fn()}
    />,
  );
  return { onAddCard };
}

/** jsdom has no layout: the sizes of the track come from the count of slides, the scroll position is ours. */
// The desktop layout unless a test says it is the phone.
let media: ReturnType<typeof stubMatchMedia>;

beforeEach(() => {
  media = stubMatchMedia({ desktop: true });
  scrollLeft = 0;
  motion.reduced = false;
  scrollBy.mockReset();
  // Only the track gets the gap and the padding of the desktop; every other element reads as usual.
  const readStyle = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) =>
    element.getAttribute('aria-label') === 'Cartões de crédito'
      ? new Proxy(readStyle(element, pseudo), {
          get: (style, name): unknown => {
            if (name === 'columnGap') return `${GAP}px`;
            if (name === 'paddingLeft' || name === 'paddingRight') return `${PADDING}px`;
            const value: unknown = Reflect.get(style, name, style);
            return typeof value === 'function' ? (value as () => unknown).bind(style) : value;
          },
        })
      : readStyle(element, pseudo),
  );
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => layout.clientWidth,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => layout.scrollWidth,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value;
    },
  });
  HTMLElement.prototype.scrollBy = scrollBy;
});

afterEach(() => {
  media.restore();
  vi.restoreAllMocks();
  // @ts-expect-error the stubs of the layout come off the prototype
  delete HTMLElement.prototype.clientWidth;
  // @ts-expect-error see above
  delete HTMLElement.prototype.scrollWidth;
  // @ts-expect-error see above
  delete HTMLElement.prototype.scrollLeft;
  // @ts-expect-error see above
  delete HTMLElement.prototype.scrollBy;
});

describe('CardSection', () => {
  it('beside a single card puts the dashed box that adds a card, and no arrows', () => {
    const { onAddCard } = renderSection(1);

    const add = screen.getByRole('button', { name: 'Adicionar cartão de crédito' });
    expect(add.className).toContain('border-dashed');
    expect(screen.queryByRole('button', { name: 'Cartões anteriores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próximos cartões' })).not.toBeInTheDocument();

    fireEvent.click(add);
    expect(onAddCard).toHaveBeenCalledTimes(1);
  });

  it('puts two cards side by side with no box and no arrows on the desktop', () => {
    renderSection(2);

    expect(screen.getByRole('img', { name: /Roxinho/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Black/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Adicionar cartão de crédito' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cartões anteriores' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próximos cartões' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Cartões de crédito' })).not.toBeInTheDocument();
  });

  it('on the phone a page is one card: two cards already have the arrows, dimmed at the start', () => {
    stubMatchMedia({ desktop: false });
    renderSection(2);
    // One slide fills the track.
    layout.clientWidth = SLIDE + 2 * PADDING;
    layout.scrollWidth = 2 * SLIDE + GAP + 2 * PADDING;
    const track = screen.getByRole('group', { name: 'Cartões de crédito' });

    const previous = screen.getByRole('button', { name: 'Cartões anteriores' });
    const next = screen.getByRole('button', { name: 'Próximos cartões' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(next).not.toHaveAttribute('aria-disabled');

    fireEvent.click(next);
    // One page is one slide and its gap.
    expect(scrollBy).toHaveBeenLastCalledWith({ left: SLIDE + GAP, behavior: 'smooth' });

    scrollLeft = layout.scrollWidth - layout.clientWidth;
    fireEvent.scroll(track);
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(previous).not.toHaveAttribute('aria-disabled');
  });

  it('on the phone one card keeps the dashed box below it and no arrows', () => {
    stubMatchMedia({ desktop: false });
    renderSection(1);

    expect(screen.getByRole('button', { name: 'Adicionar cartão de crédito' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Próximos cartões' })).not.toBeInTheDocument();
  });

  it.each([3, 5])(
    'with %i cards pages them in a track, with the arrows on the title line',
    (count) => {
      renderSection(count);

      const section = screen.getByRole('region', { name: 'Cartões de crédito' });
      const heading = within(section).getByRole('heading', { name: 'Cartões de crédito' });
      const arrows = within(section).getByRole('group', { name: 'Paginação' });
      expect(heading.parentElement).toContainElement(arrows);

      const track = within(section).getByRole('group', { name: 'Cartões de crédito' });
      expect(within(track).getAllByRole('img', { name: /final/ })).toHaveLength(count);
      // Each card travels with its invoice panel.
      expect(within(track).getAllByRole('region', { name: 'Fatura aberta' })).toHaveLength(count);
      expect(
        screen.queryByRole('button', { name: 'Adicionar cartão de crédito' }),
      ).not.toBeInTheDocument();
    },
  );

  it('dims "anterior" at the first page and "próximo" at the last one', () => {
    renderSection(5);
    const track = screen.getByRole('group', { name: 'Cartões de crédito' });
    const previous = screen.getByRole('button', { name: 'Cartões anteriores' });
    const next = screen.getByRole('button', { name: 'Próximos cartões' });

    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(next).not.toHaveAttribute('aria-disabled');

    scrollLeft = PAGE_STEP;
    fireEvent.scroll(track);
    expect(previous).not.toHaveAttribute('aria-disabled');
    expect(next).not.toHaveAttribute('aria-disabled');

    scrollLeft = layout.scrollWidth - layout.clientWidth;
    fireEvent.scroll(track);
    expect(previous).not.toHaveAttribute('aria-disabled');
    expect(next).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps the focus on an arrow that reached its end (aria-disabled, not disabled)', () => {
    renderSection(3);
    const next = screen.getByRole('button', { name: 'Próximos cartões' });
    next.focus();

    scrollLeft = layout.scrollWidth - layout.clientWidth;
    fireEvent.scroll(screen.getByRole('group', { name: 'Cartões de crédito' }));

    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(next).not.toBeDisabled();
    expect(next).toHaveFocus();
    scrollBy.mockClear();
    fireEvent.click(next);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('glides two slides and their gaps on each arrow: the visible width minus the padding, plus a gap', () => {
    renderSection(5);
    const track = screen.getByRole('group', { name: 'Cartões de crédito' });

    fireEvent.click(screen.getByRole('button', { name: 'Próximos cartões' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: PAGE_STEP, behavior: 'smooth' });
    // 632 wide, 8 of padding, one 24 gap more: not the 632 of the whole box.
    expect(PAGE_STEP).toBe(layout.clientWidth - 2 * PADDING + GAP);

    scrollLeft = PAGE_STEP;
    fireEvent.scroll(track);
    fireEvent.click(screen.getByRole('button', { name: 'Cartões anteriores' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -PAGE_STEP, behavior: 'smooth' });
  });

  it('with three cards the last page is partial: it stops at the end of the track', () => {
    renderSection(3);
    const track = screen.getByRole('group', { name: 'Cartões de crédito' });
    const end = SLIDE + GAP;

    expect(layout.scrollWidth - layout.clientWidth).toBe(end);
    scrollLeft = end;
    fireEvent.scroll(track);

    expect(screen.getByRole('button', { name: 'Próximos cartões' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Cartões anteriores' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });

  it('jumps instead of gliding when the person asked for reduced motion', () => {
    motion.reduced = true;
    renderSection(5);

    fireEvent.click(screen.getByRole('button', { name: 'Próximos cartões' }));

    expect(scrollBy).toHaveBeenLastCalledWith({ left: PAGE_STEP, behavior: 'auto' });
  });

  it('stretches the blocks of a row to one height, with each panel growing above its actions', () => {
    renderSection(2);

    const panels = screen.getAllByRole('region', { name: 'Fatura aberta' });
    const grid = panels[0]?.parentElement?.parentElement as HTMLElement;
    // The grid is not items-start: its cells stretch, and the panel takes the room left in its block.
    // The grid has no : its cells stretch; the panel takes the room left in its block.
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).not.toContain('items-start');
    for (const panel of panels) {
      expect(panel.className).toContain('flex-1');
      expect(
        within(panel).getByRole('button', { name: 'Ver fatura' }).parentElement?.className,
      ).toContain('mt-auto');
    }
  });

  it('stretches the slides of the track too, so the visible pair has one height', () => {
    renderSection(3);

    const track = screen.getByRole('group', { name: 'Cartões de crédito' });
    expect(track.className).not.toContain('items-start');
    for (const panel of within(track).getAllByRole('region', { name: 'Fatura aberta' })) {
      expect(panel.className).toContain('flex-1');
    }
  });
});
