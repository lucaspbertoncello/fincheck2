import { useId } from 'react';

import {
  NonBusinessDayShift,
  SHIFT_CAPTION,
} from '#/features/recurrences/recurrence-form/components/non-business-day-shift.component.tsx';
import { RuleGroupHeading } from '#/features/recurrences/recurrence-form/components/rule-group-heading.component.tsx';
import { DateRulePreview } from '#/features/recurrences/recurrence-form/components/date-rule-preview.component.tsx';
import { DateRuleSentence } from '#/features/recurrences/recurrence-form/components/date-rule-sentence.component.tsx';
import { DateRuleTypePicker } from '#/features/recurrences/recurrence-form/components/date-rule-type-picker.component.tsx';
import type {
  PreviewDate,
  PreviewStatus,
} from '#/features/recurrences/recurrence-form/types/preview-date.type.ts';
import type {
  RecurrenceFormErrors,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';

type RuleValues = Pick<
  RecurrenceFormValues,
  'ruleType' | 'day' | 'businessDayNumber' | 'toleranceDays' | 'nonBusinessDayShift'
>;

type DateRuleEditorProps = {
  values: RuleValues;
  errors: RecurrenceFormErrors;
  onChange: (patch: Partial<RuleValues>) => void;
  previewStatus: PreviewStatus;
  previewDates: readonly PreviewDate[];
};

/** The error of the number the chosen rule uses, if any. */
function pickError(values: RuleValues, errors: RecurrenceFormErrors): string | undefined {
  switch (values.ruleType) {
    case 'business_day':
      return errors.businessDayNumber;
    case 'around_day':
      return errors.day ?? errors.toleranceDays;
    default:
      return errors.day;
  }
}

/**
 * "Quando cai" in one block: the name of the rule, the rule written as a sentence with its numbers
 * inside, the weekend and holiday choice of "Dia fixo", and the next dates it gives. Left: choose, then read and edit. Right: the proof. On the
 * phone the three stack in that order. Every part keeps its height whatever the rule is.
 */
export function DateRuleEditor({
  values,
  errors,
  onChange,
  previewStatus,
  previewDates,
}: DateRuleEditorProps) {
  const titleId = useId();

  return (
    <div className="grid grid-cols-1 gap-s16 @xl:grid-cols-[minmax(0,1fr)_13.5rem] @xl:gap-x-s24 @xl:gap-y-0">
      <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-s8">
        <div className="flex items-baseline justify-between gap-s8">
          <RuleGroupHeading id={titleId}>Quando cai</RuleGroupHeading>
          <span
            aria-hidden="true"
            className={`hidden text-meta text-fg-secondary transition-opacity duration-(--duration-fast) ease-(--ease-standard) @xl:inline ${
              values.ruleType === 'fixed_day' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {SHIFT_CAPTION}
          </span>
        </div>
        <DateRuleTypePicker
          value={values.ruleType}
          onChange={(ruleType) => onChange({ ruleType })}
        />
        <div className="relative flex flex-col gap-s8">
          <DateRuleSentence values={values} errors={errors} onChange={onChange} />
          <NonBusinessDayShift
            ruleType={values.ruleType}
            value={values.nonBusinessDayShift}
            onChange={(nonBusinessDayShift) => onChange({ nonBusinessDayShift })}
          />
        </div>
      </section>
      <DateRulePreview
        status={previewStatus}
        dates={previewDates}
        error={pickError(values, errors)}
      />
    </div>
  );
}
