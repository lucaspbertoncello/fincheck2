import { Input, TextField } from 'react-aria-components';

import type { DateRulePhraseField } from '#/shared/types/recurrences/date-rule-phrase.type.ts';
import type {
  RecurrenceFormErrors,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';
import { describeDateRule } from '#/shared/utils/recurrences/describe-date-rule.util.ts';
import { buildDateRulePhrase } from '#/shared/utils/recurrences/build-date-rule-phrase.util.ts';
import { buildDateRule } from '#/features/recurrences/recurrence-form/utils/build-date-rule.util.ts';

type SentenceValues = Pick<
  RecurrenceFormValues,
  'ruleType' | 'day' | 'businessDayNumber' | 'toleranceDays' | 'nonBusinessDayShift'
>;

type DateRuleSentenceProps = {
  values: SentenceValues;
  errors: RecurrenceFormErrors;
  onChange: (patch: Partial<SentenceValues>) => void;
};

const digitsOnly = (text: string) => text.replace(/\D/g, '');

/** What the screen reader says for each number of the sentence. */
const FIELD_LABELS: Record<DateRulePhraseField, string> = {
  day: 'Dia do mês',
  businessDayNumber: 'Número do dia útil',
  toleranceDays: 'Dias antes ou depois',
};

const FIELD_ERROR_KEYS: Record<DateRulePhraseField, keyof RecurrenceFormErrors> = {
  day: 'day',
  businessDayNumber: 'businessDayNumber',
  toleranceDays: 'toleranceDays',
};

/** Words that stick to the number before them ("5" + "º dia útil", "10" + ", até", "10" + ", ou o dia útil seguinte"). */
const GLUED = /^[º,]/;

/**
 * The date rule as one sentence with its numbers typed inside it: "Todo dia [15]", "No [5]º dia
 * útil", "Perto do dia [10], até [3] dias antes ou depois". It is the only place the numbers are
 * edited, and the words are the ones the lists use. The box has a fixed height (two lines on the
 * phone, one on the desktop) so the rule type never moves what is around it.
 */
export function DateRuleSentence({ values, errors, onChange }: DateRuleSentenceProps) {
  const tolerance = values.toleranceDays === '' ? null : Number(values.toleranceDays);
  const parts = buildDateRulePhrase(
    values.ruleType,
    tolerance,
    values.ruleType === 'fixed_day' ? values.nonBusinessDayShift : null,
  );
  const spoken = describeDateRule(buildDateRule(values));

  return (
    <div
      role="group"
      aria-label={`Regra: ${spoken}`}
      className="flex min-h-[6.25rem] flex-wrap content-center items-center gap-x-s8 gap-y-s4 rounded-input border border-line bg-subtle px-s12 text-label text-fg-primary @xl:h-[3.25rem] @xl:min-h-0 @xl:flex-nowrap @xl:whitespace-nowrap"
    >
      {parts.map((part, index) => {
        if (part.kind === 'text') {
          return (
            <span
              key={index}
              className={`${GLUED.test(part.text) ? '-ml-s4' : ''} ${
                part.text.startsWith(', ou o dia útil') ? '@xl:hidden' : ''
              }`}
            >
              {part.text}
            </span>
          );
        }

        const { field } = part;
        return (
          <TextField
            key={index}
            aria-label={FIELD_LABELS[field]}
            name={field}
            value={values[field]}
            onChange={(text) => onChange({ [field]: digitsOnly(text) })}
            inputMode="numeric"
            autoComplete="off"
            isInvalid={errors[FIELD_ERROR_KEYS[field]] !== undefined || undefined}
          >
            <Input
              placeholder={values.ruleType === 'any_day' ? '—' : undefined}
              maxLength={2}
              className="field-ring h-9 w-12 rounded-input border border-line bg-field text-center text-label font-emphasis text-fg-primary tabular-nums outline-none placeholder:font-plain placeholder:text-fg-tertiary"
            />
          </TextField>
        );
      })}
    </div>
  );
}
