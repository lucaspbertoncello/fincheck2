import { Input, TextField } from 'react-aria-components';
import type { ReactNode } from 'react';

import type {
  RecurrenceFormErrors,
  RecurrenceFormValues,
} from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

type RuleSentenceFields = Pick<
  RecurrenceFormValues,
  'ruleType' | 'day' | 'businessDayNumber' | 'toleranceDays'
>;

type DateRuleSentenceProps = {
  values: RuleSentenceFields;
  errors: RecurrenceFormErrors;
  onChange: (patch: Partial<RuleSentenceFields>) => void;
};

const digitsOnly = (text: string) => text.replace(/\D/g, '');

type InlineNumberProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  placeholder?: string;
};

/** A number typed inside the sentence: 40 px tall, centered, the same single focus ring. */
function InlineNumber({ label, name, value, onChange, invalid, placeholder }: InlineNumberProps) {
  return (
    <TextField
      aria-label={label}
      name={name}
      value={value}
      onChange={(text) => onChange(digitsOnly(text))}
      inputMode="numeric"
      autoComplete="off"
      isInvalid={invalid || undefined}
    >
      <Input
        placeholder={placeholder}
        maxLength={2}
        className="field-ring h-ctl-tab w-14 rounded-input border border-line bg-field text-center text-body font-emphasis text-fg-primary tabular-nums outline-none placeholder:font-plain placeholder:text-fg-tertiary"
      />
    </TextField>
  );
}

function Phrase({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-s8">{children}</span>;
}

/**
 * The date rule in plain words, with the numbers typed inside the sentence: "Todo dia [15]",
 * "Todo [5]º dia útil", "Por volta do dia [25], com [2] dias de folga". What Lucas reads is what
 * the rule will do; the next dates (the trail under it) are the proof.
 */
export function DateRuleSentence({ values, errors, onChange }: DateRuleSentenceProps) {
  const { ruleType } = values;
  const dayField = (label: string, placeholder?: string) => (
    <InlineNumber
      label={label}
      name="day"
      value={values.day}
      onChange={(day) => onChange({ day })}
      invalid={errors.day !== undefined}
      placeholder={placeholder}
    />
  );
  const error =
    ruleType === 'business_day'
      ? errors.businessDayNumber
      : (errors.day ?? (ruleType === 'around_day' ? errors.toleranceDays : undefined));

  return (
    <div className="flex flex-col gap-s4">
      <div className="flex min-h-14 flex-wrap items-center gap-x-s8 gap-y-s8 rounded-input border border-line bg-subtle px-s12 py-s8 text-body text-fg-primary">
        {ruleType === 'fixed_day' ? <Phrase>Todo dia {dayField('Dia do mês')}</Phrase> : null}
        {ruleType === 'business_day' ? (
          <Phrase>
            Todo
            <InlineNumber
              label="Qual dia útil"
              name="businessDayNumber"
              value={values.businessDayNumber}
              onChange={(businessDayNumber) => onChange({ businessDayNumber })}
              invalid={errors.businessDayNumber !== undefined}
            />
            º dia útil
          </Phrase>
        ) : null}
        {ruleType === 'around_day' ? (
          <>
            <Phrase>Por volta do dia {dayField('Dia do mês')}</Phrase>
            <Phrase>
              com
              <InlineNumber
                label="Dias para mais ou menos"
                name="toleranceDays"
                value={values.toleranceDays}
                onChange={(toleranceDays) => onChange({ toleranceDays })}
                invalid={errors.toleranceDays !== undefined}
              />
              dias de folga
            </Phrase>
          </>
        ) : null}
        {ruleType === 'any_day' ? (
          <>
            <span>Qualquer dia do mês,</span>
            <Phrase>geralmente no dia {dayField('Dia provável (opcional)', '—')}</Phrase>
          </>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-meta text-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
