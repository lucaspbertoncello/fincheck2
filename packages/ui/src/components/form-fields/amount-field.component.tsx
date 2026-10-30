import { useRef, type ClipboardEvent, type CSSProperties, type PointerEvent } from 'react';
import { FieldError, Input, Label, Text, TextField as AriaTextField } from 'react-aria-components';

import { AmountKindToggle } from '#/components/form-fields/amount-kind-toggle.component.tsx';
import type { AmountKind } from '#/components/form-fields/amount-kind.type.ts';
import {
  FIELD_DESCRIPTION_CLASS,
  FIELD_ERROR_CLASS,
} from '#/components/forms/field-classes.constant.ts';
import { formatCentsInput } from '#/components/forms/format-cents-input.util.ts';
import { parseCentsInput } from '#/components/forms/parse-cents-input.util.ts';
import { parsePastedMoney } from '#/components/forms/parse-pasted-money.util.ts';
import { cx } from '#/utils/class-names.util.ts';

type AmountFieldProps = {
  /** Integer cents, always positive. Zero shows the "0,00" placeholder. */
  cents: number;
  onChange: (cents: number) => void;
  /** Direction. Together with `onKindChange` it shows the Despesa | Receita selector above. */
  kind?: AmountKind;
  onKindChange?: (kind: AmountKind) => void;
  /** Visible caption and accessible name of the number ("Valor"). */
  label?: string;
  /** Accessible name of the Despesa | Receita group. */
  kindLabel?: string;
  /** Line under the number ("Sai da conta no dia escolhido"). */
  description?: string;
  error?: string;
  name?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

const SIGN = { expense: '−', income: '+' } as const;
const SIGN_TONE = { expense: 'text-loss', income: 'text-gain' } as const;

/** Longer than this and the number shrinks (a tier of the 44 px) so it never clips the well. */
const FIT_CHARS = 8;

/** Width of the text in `ch`: digits are one `ch` (tabular), the separators about half. */
function textWidth(text: string): number {
  const separators = text.replace(/\d/g, '').length;
  return Math.max(text.length - separators / 2, 4) + 0.5;
}

/**
 * The amount of a form, the protagonist of the modal (components.md "Padrão de modal"): a well with
 * the number at 44 px (40 on the phone), tabular, in the money font, with a smaller "R$" and the
 * sign in the tone of the direction. The sign is resolved by the Despesa | Receita selector above
 * it; nobody types a minus. Typing shifts the cents (1, 12, 123, 1234 show 0,01, 0,12, 1,23, 12,34);
 * pasting reads "R$ 1.234,56" and "12,5" as written, and a bare number as whole reais. One focus
 * ring around the well. Numeric keypad on the phone.
 */
export function AmountField({
  cents,
  onChange,
  kind = 'expense',
  onKindChange,
  label = 'Valor',
  kindLabel = 'Tipo',
  description,
  error,
  name,
  isRequired,
  isDisabled,
  autoFocus,
  className,
}: AmountFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const text = formatCentsInput(cents);

  const focusInput = (event: PointerEvent<HTMLDivElement>) => {
    if (isDisabled || event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    onChange(parsePastedMoney(event.clipboardData.getData('text')));
  };

  return (
    <div className={cx('flex flex-col gap-s12', className)}>
      {onKindChange ? (
        <AmountKindToggle
          value={kind}
          onChange={onKindChange}
          label={kindLabel}
          isDisabled={isDisabled}
        />
      ) : null}
      <AriaTextField
        value={text}
        onChange={(next) => onChange(parseCentsInput(next))}
        inputMode="numeric"
        autoComplete="off"
        name={name}
        isRequired={isRequired}
        isDisabled={isDisabled}
        autoFocus={autoFocus}
        isInvalid={error ? true : undefined}
        className="flex flex-col gap-s4"
      >
        <div
          onPointerDown={focusInput}
          data-invalid={error ? true : undefined}
          data-disabled={isDisabled ? true : undefined}
          className="field-ring flex cursor-text flex-col items-center gap-s4 rounded-panel border border-line bg-field px-s16 py-s12 data-[disabled]:cursor-default data-[disabled]:opacity-50 lg:gap-s8 lg:py-s16"
        >
          <Label className="sr-only text-label text-fg-secondary lg:not-sr-only">{label}</Label>
          <div
            style={
              { '--amount-fit': Math.min(1, FIT_CHARS / Math.max(text.length, 1)) } as CSSProperties
            }
            className="amount-size money-numeric flex max-w-full items-baseline justify-center gap-s8 overflow-hidden leading-(--line-height-money) font-numeric"
          >
            <span aria-hidden="true" className={cx('amount-affix', SIGN_TONE[kind])}>
              {SIGN[kind]}
            </span>
            <span aria-hidden="true" className="amount-affix text-fg-secondary">
              R$
            </span>
            <Input
              ref={inputRef}
              placeholder="0,00"
              enterKeyHint="done"
              onPaste={paste}
              style={{ width: `${textWidth(text)}ch` }}
              className="min-w-0 bg-transparent text-center tracking-(--letter-spacing-money-lg) text-fg-primary outline-none placeholder:text-fg-tertiary"
            />
          </div>
        </div>
        {description ? (
          <Text slot="description" className={FIELD_DESCRIPTION_CLASS}>
            {description}
          </Text>
        ) : null}
        <FieldError className={FIELD_ERROR_CLASS}>{error}</FieldError>
      </AriaTextField>
    </div>
  );
}
