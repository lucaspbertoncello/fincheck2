/**
 * The view-transition name of a card: unique per card, so the card on the list and the card at the
 * top of its invoice page are the same element for the browser, and two cards never share a name
 * (a duplicate aborts the transition). The CSS only applies it while a `card` transition runs.
 */
export function buildCardTransitionName(cardId: string): string {
  return `card-${cardId}`;
}
