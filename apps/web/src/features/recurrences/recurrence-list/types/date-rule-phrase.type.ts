/** The editable numbers of a date rule. */
export type DateRulePhraseField = 'day' | 'businessDayNumber' | 'toleranceDays';

/**
 * One piece of the sentence that says when a recurrence falls: plain words, or the place of a
 * number. The form fills the places with inputs, the lists fill them with the saved numbers, so
 * the same rule is written the same way everywhere.
 */
export type DateRulePhrasePart =
  { kind: 'text'; text: string } | { kind: 'field'; field: DateRulePhraseField };
