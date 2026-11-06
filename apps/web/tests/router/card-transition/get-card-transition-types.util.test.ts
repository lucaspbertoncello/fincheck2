import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCardTransitionTypes } from '#/router/card-transition/get-card-transition-types.util.ts';
import { sharedCardStore } from '#/router/card-transition/shared-card.store.ts';

const change = (from: string | undefined, to: string, pathChanged = true) => ({
  fromLocation: from ? { pathname: from } : undefined,
  toLocation: { pathname: to },
  pathChanged,
});

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
}

afterEach(() => {
  sharedCardStore.set(null);
  vi.unstubAllGlobals();
});

describe('getCardTransitionTypes', () => {
  it('carries the clicked card forward to its invoice and back to the list', () => {
    mockReducedMotion(false);
    sharedCardStore.set('a1');

    expect(getCardTransitionTypes(change('/accounts', '/cards/a1/invoices/2026-11'))).toEqual([
      'card',
      'fwd',
    ]);
    expect(getCardTransitionTypes(change('/cards/a1/invoices/2026-11', '/accounts'))).toEqual([
      'card',
      'back',
    ]);
  });

  it('uses a plain fade (no morph) with reduced motion', () => {
    mockReducedMotion(true);
    sharedCardStore.set('a1');

    expect(getCardTransitionTypes(change('/accounts', '/cards/a1/invoices/2026-11'))).toEqual([
      'reduce',
      'fwd',
    ]);
  });

  it('does not morph the card on the arrows between invoices of the same card', () => {
    mockReducedMotion(false);
    sharedCardStore.set('a1');

    expect(
      getCardTransitionTypes(change('/cards/a1/invoices/2026-11', '/cards/a1/invoices/2026-10')),
    ).toBe(false);
  });

  it('leaves the other navigations to the tab rules', () => {
    mockReducedMotion(false);
    sharedCardStore.set('a1');

    // First load and a path that did not change.
    expect(getCardTransitionTypes(change(undefined, '/accounts'))).toBe(false);
    expect(getCardTransitionTypes(change('/accounts', '/accounts', false))).toBe(false);
    // Another card than the one that was clicked.
    expect(getCardTransitionTypes(change('/accounts', '/cards/b2/invoices/2026-11'))).toBe(false);
    // An invoice reached from "A pagar e receber", and the way back to it.
    expect(getCardTransitionTypes(change('/recurrences/bills', '/cards/a1/invoices/2026-11'))).toBe(
      false,
    );
    expect(getCardTransitionTypes(change('/cards/a1/invoices/2026-11', '/recurrences/bills'))).toBe(
      false,
    );
  });

  it('has no transition when no card was clicked', () => {
    mockReducedMotion(false);

    expect(getCardTransitionTypes(change('/accounts', '/cards/a1/invoices/2026-11'))).toBe(false);
  });
});
