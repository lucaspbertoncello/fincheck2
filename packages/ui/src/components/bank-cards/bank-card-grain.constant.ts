/** Fractal-noise grain laid over the card with `mix-blend-mode: overlay` (bank themes page). */
export const BANK_CARD_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Brushed-metal lines over the gloss of the metal variants. */
export const BANK_CARD_METAL_LINES =
  'repeating-linear-gradient(90deg,oklch(1 0 0 / .035) 0 1px,transparent 1px 3px)';

export const BANK_NETWORK_LABEL = {
  mc: 'Mastercard',
  visa: 'Visa',
  elo: 'Elo',
} as const;
