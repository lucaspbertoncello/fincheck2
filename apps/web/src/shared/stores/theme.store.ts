// Browser preference: the color theme, saved in localStorage. The inline script of index.html
// applies it before the first paint; this store applies it when the person changes it.
// "Sistema" is the absence of a saved choice: the index.html script then follows the OS, and
// this store keeps following it while the preference is "system".

type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

const STORAGE_KEY = 'fincheck:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

let stopFollowingSystem: (() => void) | null = null;

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

function readSavedTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function hasMatchMedia(): boolean {
  return typeof window.matchMedia === 'function';
}

function getSystemTheme(): Theme {
  if (!hasMatchMedia()) return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function followSystemTheme(): void {
  stopFollowingSystem?.();
  if (!hasMatchMedia()) return;
  const query = window.matchMedia(DARK_QUERY);
  const onChange = () => applyTheme(getSystemTheme());
  query.addEventListener('change', onChange);
  stopFollowingSystem = () => query.removeEventListener('change', onChange);
}

/** Saved choice, or "system" when the person never chose (or chose "Sistema"). */
export function getThemePreference(): ThemePreference {
  return readSavedTheme() ?? 'system';
}

function setTheme(theme: Theme): void {
  stopFollowingSystem?.();
  stopFollowingSystem = null;
  applyTheme(theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Blocked storage: the theme holds until the reload.
  }
}

export function setThemePreference(preference: ThemePreference): void {
  if (preference !== 'system') {
    setTheme(preference);
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage: "Sistema" holds until the reload.
  }
  applyTheme(getSystemTheme());
  followSystemTheme();
}
