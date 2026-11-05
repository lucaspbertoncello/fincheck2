// State of a subscription in the month asked for (BR-REC-017).
export const SUBSCRIPTION_STATUSES = ['charged', 'upcoming', 'missed'] as const;

// A purchase on the card becomes a suggestion when the same description comes back in
// `minMonths` months in a row with an amount within `amountTolerance` (a fraction of the last
// amount) and a day within `dayTolerance` days (BR-REC-017).
export const SUBSCRIPTION_SUGGESTION_LIMITS = {
  amountTolerance: 0.15,
  dayTolerance: 5,
  minMonths: 2,
} as const;

// The last charge differs from the expected amount by more than this (R$ 0,50) to warn that the
// price changed.
export const SUBSCRIPTION_PRICE_CHANGE_THRESHOLD_CENTS = 50;
