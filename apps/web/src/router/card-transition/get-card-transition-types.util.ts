import { sharedCardStore } from '#/router/card-transition/shared-card.store.ts';

type LocationChange = {
  fromLocation?: { pathname: string };
  toLocation: { pathname: string };
  pathChanged: boolean;
};

const INVOICE_PATH = /^\/cards\/([^/]+)\/invoices\//;

function isAccountsList(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === '/accounts';
}

function getInvoiceCardId(pathname: string): string | null {
  return INVOICE_PATH.exec(pathname)?.[1] ?? null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * View-transition types of the card that travels (motion.md 1.6): `card` + `fwd` from Contas e
 * cartões to the invoice of the card that was clicked, `card` + `back` on the way back. Reduced
 * motion gets `reduce` (a plain fade, no morph). Anything else returns false so the tab rules
 * decide: the arrows between invoices of the same card, an invoice reached from "A pagar e
 * receber", a card that was not the clicked one.
 */
export function getCardTransitionTypes({
  fromLocation,
  toLocation,
  pathChanged,
}: LocationChange): string[] | false {
  if (!fromLocation || !pathChanged) return false;
  const cardId = sharedCardStore.getSnapshot();
  if (!cardId) return false;

  const forward =
    isAccountsList(fromLocation.pathname) && getInvoiceCardId(toLocation.pathname) === cardId;
  const backward =
    getInvoiceCardId(fromLocation.pathname) === cardId && isAccountsList(toLocation.pathname);
  if (!forward && !backward) return false;

  return [prefersReducedMotion() ? 'reduce' : 'card', forward ? 'fwd' : 'back'];
}
