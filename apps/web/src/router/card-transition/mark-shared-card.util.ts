import { flushSync } from 'react-dom';

import { sharedCardStore } from '#/router/card-transition/shared-card.store.ts';

/**
 * Says which card the next navigation carries, and draws it before the router takes the picture of
 * the old page: `flushSync` makes the name land on this card (and leave the previous one) first.
 */
export function markSharedCard(cardId: string): void {
  flushSync(() => sharedCardStore.set(cardId));
}
