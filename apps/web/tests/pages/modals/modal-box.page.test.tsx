import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

const LONG_WAIT = { timeout: 5000 };
const FIXED_HEIGHT = /(^|\s)h-\[\d+rem\](\s|$)/;

/** The panel of the dialog (the React Aria `Modal` element that carries the box classes). */
function box(dialog: HTMLElement): string {
  return dialog.parentElement?.className ?? '';
}

function everyShortControlStaysOnOneLine(dialog: HTMLElement) {
  const controls = [
    ...within(dialog).queryAllByRole('button'),
    ...within(dialog).queryAllByRole('radio'),
  ];
  for (const control of controls) {
    // A control is a chip/button/segment when it is a pill; free-form rows keep their own layout.
    const own = [control, control.closest('label')].filter(Boolean) as HTMLElement[];
    const isPill = own.some((node) => node.className.includes('rounded-capsule'));
    if (isPill && (control.textContent ?? '').trim() !== '') {
      expect(
        own.some((node) => node.className.includes('whitespace-nowrap')),
        `"${control.textContent}" can wrap`,
      ).toBe(true);
    }
  }
}

describe('Modal box (fixed size, no wrap)', () => {
  it('keeps the "Nova transação" box when the type changes and "Mais opções" opens', async () => {
    const user = userEvent.setup();
    renderApp(`/transactions?month=${CURRENT_MONTH}&new=transaction`);
    const dialog = await screen.findByRole('dialog', { name: 'Nova transação' }, LONG_WAIT);
    const before = box(dialog);

    expect(before).toMatch(FIXED_HEIGHT);
    await user.click(within(dialog).getByRole('radio', { name: 'Receita' }));
    expect(box(dialog)).toBe(before);
    await user.click(within(dialog).getByRole('radio', { name: 'Despesa' }));
    expect(box(dialog)).toBe(before);
    everyShortControlStaysOnOneLine(dialog);
  });

  it('keeps the "Nova categoria" box when the kind changes', async () => {
    const user = userEvent.setup();
    renderApp('/categories?new=category');
    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    const before = box(dialog);

    expect(before).toMatch(FIXED_HEIGHT);
    const kinds = within(dialog).getAllByRole('radio');
    await user.click(kinds[1] as HTMLElement);
    expect(box(dialog)).toBe(before);
    everyShortControlStaysOnOneLine(dialog);
    await waitFor(() => expect(dialog).toBeInTheDocument());
  });

  it('gives the bill modal and the friend debt modal a fixed box and unbreakable segments', async () => {
    const user = userEvent.setup();
    renderApp(`/recurrences/bills?month=${CURRENT_MONTH}&new=bill`);
    const bill = await screen.findByRole('dialog', { name: 'Nova conta a pagar ou receber' });
    const before = box(bill);

    expect(before).toMatch(FIXED_HEIGHT);
    await user.click(within(bill).getByRole('radio', { name: 'A receber' }));
    expect(box(bill)).toBe(before);
    everyShortControlStaysOnOneLine(bill);
  });
});

/**
 * "Mais opções" enters last (components.md 13.6): from the toggle up to the scrolling body, nothing
 * follows it, so opening it cannot push any block that was already on screen.
 */
function nothingFollowsTheToggleSection(dialog: HTMLElement) {
  const toggle = within(dialog).getByRole('button', {
    name: /Mais opções|Observação|Por que corrigiu/,
  });
  let node: HTMLElement | null = toggle.closest('section');
  expect(node, 'the toggle has no section').not.toBeNull();
  while (node && !node.className.includes('overflow-y-auto')) {
    // A closed Collapse (the error banner's slot) takes no room, so it does not count as "after".
    const next = node.nextElementSibling;
    const isClosedCollapse = next?.className.includes('grid-rows-[0fr]') ?? false;
    expect(
      isClosedCollapse ? null : next,
      `something follows <${node.tagName} class="${node.className}">`,
    ).toBeNull();
    node = node.parentElement;
  }
  expect(node, 'no scrolling body above the toggle').not.toBeNull();
}

describe('"Mais opções" enters last', () => {
  it.each([
    ['Nova transação', `/transactions?month=${CURRENT_MONTH}&new=transaction`],
    ['Nova recorrência', `/recurrences?month=${CURRENT_MONTH}&new=recurrence`],
    ['Nova conta a pagar ou receber', `/recurrences/bills?month=${CURRENT_MONTH}&new=bill`],
  ])('%s: nothing follows the toggle in the body', async (name, url) => {
    renderApp(url);
    const dialog = await screen.findByRole('dialog', { name }, LONG_WAIT);

    nothingFollowsTheToggleSection(dialog);
  });
});
