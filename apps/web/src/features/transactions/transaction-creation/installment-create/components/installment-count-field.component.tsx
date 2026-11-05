import { Collapse, FieldSet, TextField } from '@fincheck/ui';
import { useState } from 'react';
import { Button as AriaButton, ToggleButton } from 'react-aria-components';

import { INSTALLMENT_COUNT_PRESETS } from '#/features/transactions/transaction-creation/installment-create/constants/installment-count-presets.constant.ts';
import {
  QUICK_CHIP_CLASS,
  QUICK_CHIP_ON_CLASS,
} from '#/features/transactions/transaction-fields/constants/quick-chip-class.constant.ts';

type InstallmentCountFieldProps = {
  /** Text of the count, so it can be empty while typing. */
  countText: string;
  onChange: (countText: string) => void;
  error?: string;
};

/**
 * How many installments: the usual counts are one tap ("10×"), and "Outro" opens a number field for
 * the rest. The chosen chip keeps its width and border; only the fill changes.
 */
export function InstallmentCountField({ countText, onChange, error }: InstallmentCountFieldProps) {
  const [custom, setCustom] = useState(
    countText !== '' && !INSTALLMENT_COUNT_PRESETS.some((count) => String(count) === countText),
  );

  return (
    <FieldSet label="Parcelas" error={custom ? undefined : error}>
      <div className="flex flex-wrap gap-s8">
        {INSTALLMENT_COUNT_PRESETS.map((count) => {
          const selected = !custom && countText === String(count);
          return (
            <ToggleButton
              key={count}
              isSelected={selected}
              aria-label={`${count} parcelas`}
              onChange={() => {
                setCustom(false);
                onChange(String(count));
              }}
              className={`${QUICK_CHIP_CLASS} tabular-nums ${selected ? QUICK_CHIP_ON_CLASS : ''}`}
            >
              {count}×
            </ToggleButton>
          );
        })}
        <AriaButton
          aria-expanded={custom}
          onPress={() => {
            // The number field starts empty, so the digits typed are the whole count.
            if (!custom) onChange('');
            setCustom(true);
          }}
          className={`${QUICK_CHIP_CLASS} ${custom ? QUICK_CHIP_ON_CLASS : 'border-dashed'}`}
        >
          Outro
        </AriaButton>
      </div>
      <Collapse isOpen={custom} contentClassName="pt-s8">
        <TextField
          label="Número de parcelas"
          value={countText}
          onChange={onChange}
          error={error}
          inputMode="numeric"
          autoComplete="off"
          maxLength={2}
          autoFocus
          className="w-40"
        />
      </Collapse>
    </FieldSet>
  );
}
