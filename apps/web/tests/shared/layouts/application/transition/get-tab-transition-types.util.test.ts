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

  it('has no transition on the first load, on a month change or inside one tab', () => {
    expect(getTabTransitionTypes(change(undefined, '/'))).toBe(false);
    expect(getTabTransitionTypes(change('/', '/', false))).toBe(false);
    expect(getTabTransitionTypes(change('/recurrences', '/recurrences/bills'))).toBe(false);
  });

  it('has no transition to or from Configurações', () => {
    expect(getTabTransitionTypes(change('/', '/settings'))).toBe(false);
    expect(getTabTransitionTypes(change('/settings', '/accounts'))).toBe(false);
  });
});
