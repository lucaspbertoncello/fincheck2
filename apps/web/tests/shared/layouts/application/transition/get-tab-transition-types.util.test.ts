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

  it('enters Configurações as the position after Categorias, from any tab, marked as an edge', () => {
    for (const from of [
      '/',
      '/transactions',
      '/recurrences/bills',
      '/accounts',
      '/categories/rules',
    ]) {
      expect(getTabTransitionTypes(change(from, '/settings'))).toEqual(['tab', 'fwd', 'edge']);
      expect(getTabTransitionTypes(change(from, '/settings/backup'))).toEqual([
        'tab',
        'fwd',
        'edge',
      ]);
    }
  });

  it('leaves Configurações backward, to any tab, marked as an edge', () => {
    for (const to of [
      '/',
      '/transactions',
      '/recurrences',
      '/accounts',
      '/categories',
      '/profile',
    ]) {
      expect(getTabTransitionTypes(change('/settings/connections', to))).toEqual([
        'tab',
        'back',
        'edge',
      ]);
      expect(getTabTransitionTypes(change('/settings', to))).toEqual(['tab', 'back', 'edge']);
    }
  });

  it('puts Perfil between Categorias and Configurações: forward from the tabs, back from Configurações', () => {
    expect(getTabTransitionTypes(change('/categories', '/profile'))).toEqual(['tab', 'fwd']);
    expect(getTabTransitionTypes(change('/', '/profile'))).toEqual(['tab', 'fwd']);
    expect(getTabTransitionTypes(change('/profile', '/categories/rules'))).toEqual(['tab', 'back']);
    // The edge flag is about the left column of Configurações, which Perfil does not have.
    expect(getTabTransitionTypes(change('/profile', '/settings'))).toEqual(['tab', 'fwd', 'edge']);
    expect(getTabTransitionTypes(change('/settings/backup', '/profile'))).toEqual([
      'tab',
      'back',
      'edge',
    ]);
    expect(getTabTransitionTypes(change('/profile', '/profile', false))).toBe(false);
  });

  it('uses the "reduce" type for the edge of Configurações with reduced motion', () => {
    const original: unknown = Reflect.get(window, 'matchMedia');
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
    })) as unknown as typeof window.matchMedia;
    try {
      expect(getTabTransitionTypes(change('/', '/settings'))).toEqual(['reduce', 'fwd', 'edge']);
      expect(getTabTransitionTypes(change('/settings/backup', '/'))).toEqual([
        'reduce',
        'back',
        'edge',
      ]);
    } finally {
      window.matchMedia = original as typeof window.matchMedia;
    }
  });

  it('slides between the list of the phone and its pages, and not within the same screen', () => {
    expect(getTabTransitionTypes(change('/settings', '/settings/connections'))).toEqual([
      'tab',
      'fwd',
    ]);
    expect(getTabTransitionTypes(change('/settings/appearance', '/settings'))).toEqual([
      'tab',
      'back',
    ]);
    expect(getTabTransitionTypes(change('/settings', '/settings'))).toBe(false);
  });

  it('slides between the Configurações pages in the order of their menu', () => {
    expect(getTabTransitionTypes(change('/settings/connections', '/settings/appearance'))).toEqual([
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
