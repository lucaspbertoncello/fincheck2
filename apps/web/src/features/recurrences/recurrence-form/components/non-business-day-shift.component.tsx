import { ChoiceField, FineNote } from '@fincheck/ui';
import { useState } from 'react';

import {
  NON_BUSINESS_DAY_SHIFT_OPTIONS,
  NO_SHIFT_HINTS,
} from '#/features/recurrences/recurrence-form/constants/non-business-day-shifts.constant.ts';
import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-form/types/recurrence-form.type.ts';

type NonBusinessDayShiftProps = {
  ruleType: RecurrenceFormValues['ruleType'];
  value: RecurrenceFormValues['nonBusinessDayShift'];
  onChange: (shift: RecurrenceFormValues['nonBusinessDayShift']) => void;
};

const LAYER_CLASS =
  'col-start-1 row-start-1 transition-opacity duration-(--duration-fast) ease-(--ease-standard)';

/** The caption of the choice, said once above it: above the box on the desktop. */
export const SHIFT_CAPTION = 'Se cair no fim de semana ou feriado';

/**
 * "Se cair no fim de semana ou feriado": only "Dia fixo" has it. On the phone it sits under the
 * sentence box; from `@xl` it is laid over the empty right side of that box (the parent is
 * `relative`), with its caption in the heading row, so it adds no height. The space is the same for every
 * rule: the choice and a one-line hint sit on top of each other in one grid cell, so the cell is as
 * tall as the choice and the modal never changes height when the rule changes. The one that is not
 * for the chosen rule fades out and is `inert` (no focus, not read).
 */
export function NonBusinessDayShift({ ruleType, value, onChange }: NonBusinessDayShiftProps) {
  const fixed = ruleType === 'fixed_day';
  // While the hint fades out (back to "Dia fixo") it keeps the words it had.
  const [hint, setHint] = useState(ruleType === 'fixed_day' ? '' : NO_SHIFT_HINTS[ruleType]);
  if (ruleType !== 'fixed_day' && hint !== NO_SHIFT_HINTS[ruleType]) {
    setHint(NO_SHIFT_HINTS[ruleType]);
  }

  return (
    <div className="grid @xl:absolute @xl:inset-y-0 @xl:right-s4 @xl:flex @xl:items-center">
      <div
        className={`${LAYER_CLASS} @xl:[&>div>span:first-child]:hidden ${fixed ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        inert={!fixed}
        aria-hidden={!fixed}
      >
        <ChoiceField
          label={SHIFT_CAPTION}
          variant="segmented"
          options={NON_BUSINESS_DAY_SHIFT_OPTIONS}
          value={value}
          onChange={(key) => onChange(key as RecurrenceFormValues['nonBusinessDayShift'])}
        />
      </div>
      <div
        className={`${LAYER_CLASS} @xl:hidden flex items-center ${fixed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        inert={fixed}
        aria-hidden={fixed}
      >
        <FineNote icon="calendar">{hint}</FineNote>
      </div>
    </div>
  );
}
