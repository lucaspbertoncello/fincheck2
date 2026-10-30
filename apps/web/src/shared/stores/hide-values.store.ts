// Browser preference: the eye that hides every money value (BR-DSH-013). It lives in localStorage
// and not in the URL, because it holds for the whole app and across reloads. A tiny external
// store read with useSyncExternalStore; no library needed.

const STORAGE_KEY = 'fincheck:hide-values';
const listeners = new Set<() => void>();

function readStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let current = readStored();

export const hideValuesStore = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): boolean => current,
  set: (hidden: boolean): void => {
    current = hidden;
    try {
      window.localStorage.setItem(STORAGE_KEY, hidden ? '1' : '0');
    } catch {
      // Private mode or blocked storage: the preference holds only until the reload.
    }
    listeners.forEach((listener) => listener());
  },
};
