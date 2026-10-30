import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getTheme,
  getThemePreference,
  setTheme,
  setThemePreference,
} from '#/shared/stores/theme.store.ts';
import { stubMatchMedia } from '#tests/support/viewport/stub-match-media.util.ts';

describe('theme store', () => {
  let media: ReturnType<typeof stubMatchMedia>;

  beforeEach(() => {
    media = stubMatchMedia();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    setTheme('light'); // stops following the system theme
    window.localStorage.clear();
    media.restore();
  });

  it('reads "system" when nothing is saved', () => {
    expect(getThemePreference()).toBe('system');
  });

  it('saves a fixed choice and applies it', () => {
    setThemePreference('dark');

    expect(getTheme()).toBe('dark');
    expect(getThemePreference()).toBe('dark');
    expect(window.localStorage.getItem('fincheck:theme')).toBe('dark');
  });

  it('"system" forgets the saved choice and follows the OS, also when it changes', () => {
    setThemePreference('light');
    media.setSystemDark(true);

    setThemePreference('system');

    expect(window.localStorage.getItem('fincheck:theme')).toBeNull();
    expect(getThemePreference()).toBe('system');
    expect(getTheme()).toBe('dark');

    media.setSystemDark(false);
    expect(getTheme()).toBe('light');
  });

  it('a fixed choice stops following the OS', () => {
    setThemePreference('system');
    setThemePreference('light');

    media.setSystemDark(true);

    expect(getTheme()).toBe('light');
  });
});
