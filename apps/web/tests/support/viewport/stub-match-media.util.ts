type MediaState = { desktop: boolean; dark: boolean };

type Listener = () => void;

/**
 * jsdom has no `matchMedia`. This installs one that answers the two questions the app asks:
 * "is it 1024 px or wider" (desktop layout) and "does the OS prefer dark". Returns a setter for
 * the OS preference that notifies the listeners, and the restore function.
 */
export function stubMatchMedia(initial: Partial<MediaState> = {}) {
  const state: MediaState = { desktop: false, dark: false, ...initial };
  const listeners = new Map<string, Set<Listener>>();
  const original: unknown = Reflect.get(window, 'matchMedia');

  window.matchMedia = ((query: string) => {
    const set = listeners.get(query) ?? new Set<Listener>();
    listeners.set(query, set);

    return {
      get matches() {
        if (query.includes('min-width: 1024px')) return state.desktop;
        if (query.includes('prefers-color-scheme: dark')) return state.dark;
        return false;
      },
      media: query,
      addEventListener: (_type: string, listener: Listener) => set.add(listener),
      removeEventListener: (_type: string, listener: Listener) => set.delete(listener),
    };
  }) as unknown as typeof window.matchMedia;

  return {
    setSystemDark(dark: boolean) {
      state.dark = dark;
      listeners.get('(prefers-color-scheme: dark)')?.forEach((listener) => listener());
    },
    restore() {
      Reflect.set(window, 'matchMedia', original);
    },
  };
}
