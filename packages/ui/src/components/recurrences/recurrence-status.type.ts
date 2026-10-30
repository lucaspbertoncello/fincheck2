/** Whether the money comes in or goes out. */
export type RecurrenceFlow = 'income' | 'expense';

/**
 * State of one occurrence: expected, received (confirmed), partial, late, different amount,
 * dismissed for the month (Q7) or paid but not yet linked to a transaction (R1).
 */
export type RecurrenceStatus =
  'expected' | 'received' | 'partial' | 'late' | 'different' | 'dismissed' | 'paid-unlinked';

/** Buttons shown under the row when the occurrence needs a decision. */
export type RecurrenceInlineAction = 'mark-done' | 'link' | 'edit-expected';

/** Everything a row can ask for, inline or from the "…" menu. */
export type RecurrenceAction =
  RecurrenceInlineAction | 'dismiss' | 'undismiss' | 'edit' | 'pause' | 'delete';
