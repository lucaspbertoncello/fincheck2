import { describe, expect, it } from 'vitest';

import { getTabTransitionTypes } from '#/shared/layouts/application/transition/get-tab-transition-types.util.ts';

const change = (from: string | undefined, to: string, pathChanged = true) => ({
  fromLocation: from ? { pathname: from } : undefined,
  toLocation: { pathname: to },
  pathChanged,
});

describe('getTabTransitionTypes', () => {
  it('goes forward to a tab on the right and back to one on the left', () => {
    expect(getTabTransitionTypes(change('/', '/transactions'))).toEqual(['tab', 'fwd']);
    expect(getTabTransitionTypes(change('/accounts', '/transactions'))).toEqual(['tab', 'back']);
  });

  it('has no transition on the first load, on a month change or on a screen without sub-tabs', () => {
    expect(getTabTransitionTypes(change(undefined, '/'))).toBe(false);
    expect(getTabTransitionTypes(change('/', '/', false))).toBe(false);
    expect(getTabTransitionTypes(change('/transactions', '/transactions/review'))).toBe(false);
  });

  it('slides between the two sub-tabs of a tab, in the order of the sub-tabs', () => {
    expect(getTabTransitionTypes(change('/recurrences', '/recurrences/bills'))).toEqual([
      'tab',
      'fwd',
    ]);
    expect(getTabTransitionTypes(change('/recurrences/bills', '/recurrences'))).toEqual([
      'tab',
      'back',
    ]);
    expect(getTabTransitionTypes(change('/categories', '/categories/rules'))).toEqual([
      'tab',
      'fwd',
    ]);
    expect(getTabTransitionTypes(change('/categories/rules', '/categories'))).toEqual([
      'tab',
      'back',
    ]);
  });

  it('uses the "reduce" type instead of "tab" with reduced motion', () => {
    const original: unknown = Reflect.get(window, 'matchMedia');
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
    })) as unknown as typeof window.matchMedia;
    try {
      expect(getTabTransitionTypes(change('/', '/accounts'))).toEqual(['reduce', 'fwd']);
      expect(getTabTransitionTypes(change('/categories/rules', '/categories'))).toEqual([
        'reduce',
        'back',
      ]);
    } finally {
      window.matchMedia = original as typeof window.matchMedia;
    }
  });

  it('has no transition to or from Configurações', () => {
    expect(getTabTransitionTypes(change('/', '/settings'))).toBe(false);
    expect(getTabTransitionTypes(change('/settings', '/accounts'))).toBe(false);
  });

  it('slides between the Configurações pages in the order of their menu', () => {
    expect(getTabTransitionTypes(change('/settings/profile', '/settings/backup'))).toEqual([
      'tab',
      'fwd',
    ]);
    expect(getTabTransitionTypes(change('/settings/appearance', '/settings/connections'))).toEqual([
      'tab',
      'back',
    ]);
    expect(getTabTransitionTypes(change('/settings/backup', '/settings/backup'))).toBe(false);
  });
});
