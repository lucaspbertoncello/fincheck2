// The card that travels between Contas e cartões and its invoice page (motion.md 1.6). Set by the
// click that opens the invoice, read by the list when it draws the card (only this one carries the
// transition name) and by the router when it picks the transition. A tiny external store read with
// useSyncExternalStore, like the other browser-side stores.

const listeners = new Set<() => void>();
let current: string | null = null;

export const sharedCardStore = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): string | null => current,
  set: (cardId: string | null): void => {
    current = cardId;
    listeners.forEach((listener) => listener());
  },
};
