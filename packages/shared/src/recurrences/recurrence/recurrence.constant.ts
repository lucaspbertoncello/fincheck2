export const RECURRENCE_KINDS = ['income', 'expense'] as const;
// How an income is paid (BR-PRF-002); only income recurrences carry it.
export const EMPLOYMENT_REGIMES = ['clt', 'pj', 'other'] as const;
export const AMOUNT_MODES = ['fixed', 'last_received'] as const;
export const DATE_RULE_TYPES = ['fixed_day', 'business_day', 'around_day', 'any_day'] as const;
// What a fixed day does when it falls on a weekend or a national holiday (BR-REC-016).
export const NON_BUSINESS_DAY_SHIFTS = ['none', 'before', 'after'] as const;

export const MAX_PAYMENTS_LIMITS = { min: 1, max: 5 } as const;
export const TOLERANCE_DAYS_LIMITS = { min: 0, max: 15 } as const;
export const BUSINESS_DAY_NUMBER_LIMITS = { min: 1, max: 23 } as const;
