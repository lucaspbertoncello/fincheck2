// Browser preference: the color theme, saved in localStorage. The inline script of index.html
// applies it before the first paint; this store applies it when the person changes it.

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'fincheck:theme';

export function getTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Blocked storage: the theme holds until the reload.
  }
}
