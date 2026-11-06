import { useSyncExternalStore } from 'react';

import { sharedCardStore } from '#/router/card-transition/shared-card.store.ts';

/** The id of the card that travels between the list and its invoice page, or null. */
export function useSharedCardId(): string | null {
  return useSyncExternalStore(sharedCardStore.subscribe, sharedCardStore.getSnapshot);
}
