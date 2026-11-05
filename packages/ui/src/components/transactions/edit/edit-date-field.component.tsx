import { parseDate, type CalendarDate } from '@internationalized/date';
import { DateField, DateInput, DateSegment, I18nProvider, Label } from 'react-aria-components';

import { FIELD_BOX_CLASS, FIELD_LABEL_CLASS } from '#/components/forms/field-classes.constant.ts';
import { cx } from '#/utils/class-names.util.ts';
import { FieldErrorMessage } from '#/components/forms/field-error-message.component.tsx';

type EditDateFieldProps = {
  label: string;
  /** Business date, `YYYY-MM-DD`. An empty or invalid text shows an empty field. */
  value: string;
  /** Business date `YYYY-MM-DD`, or an empty text while the date is incomplete. */
  onChange: (value: string) => void;
  error?: string;
  className?: string;
};

function toCalendarDate(value: string): CalendarDate | null {
  try {
    return parseDate(value);
  } catch {
    return null;
  }
}

/** Date field of the edit form: dd/mm/aaaa in pt-BR (16 px text, 48 px tall) with label and error. */
export function EditDateField({ label, value, onChange, error, className }: EditDateFieldProps) {
  return (
    <I18nProvider locale="pt-BR">
      <DateField
        value={toCalendarDate(value)}
        onChange={(date) => onChange(date ? date.toString() : '')}
        isInvalid={error ? true : undefined}
        className={cx('flex flex-col gap-s4', className)}
      >
        <Label className={FIELD_LABEL_CLASS}>{label}</Label>
        <DateInput className={cx(FIELD_BOX_CLASS, 'flex items-center tabular-nums')}>
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded-tiny px-px outline-none data-[focused]:bg-brand data-[focused]:text-fg-on-accent data-[placeholder]:text-fg-tertiary"
            />
          )}
        </DateInput>
        <FieldErrorMessage error={error} />
      </DateField>
    </I18nProvider>
  );
}
