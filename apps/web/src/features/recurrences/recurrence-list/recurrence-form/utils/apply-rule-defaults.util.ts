import {
  DEFAULT_BUSINESS_DAY,
  DEFAULT_RULE_DAY,
  DEFAULT_TOLERANCE_DAYS,
} from '#/features/recurrences/recurrence-list/recurrence-form/constants/rule-defaults.constant.ts';
import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

type RuleFields = Pick<
  RecurrenceFormValues,
  'ruleType' | 'day' | 'businessDayNumber' | 'toleranceDays'
>;

/**
 * What a rule type needs to be complete the moment it is chosen: the numbers the person has not
 * typed yet are filled with the example of its card, so the sentence and the next dates are never
 * empty. A number already typed is kept ("Por volta de" reuses the day of "Dia fixo"). "Qualquer
 * dia" has no required number.
 */
export function applyRuleDefaults(values: RuleFields): Partial<RuleFields> {
  switch (values.ruleType) {
    case 'fixed_day':
      return { day: values.day || DEFAULT_RULE_DAY };
    case 'business_day':
      return { businessDayNumber: values.businessDayNumber || DEFAULT_BUSINESS_DAY };
    case 'around_day':
      return {
        day: values.day || DEFAULT_RULE_DAY,
        toleranceDays: values.toleranceDays || DEFAULT_TOLERANCE_DAYS,
      };
    case 'any_day':
      return {};
  }
}
