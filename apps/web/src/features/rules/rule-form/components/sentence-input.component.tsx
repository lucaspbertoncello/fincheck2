import { Input, TextField } from 'react-aria-components';

type SentenceInputProps = {
  /** Accessible name; the sentence around it is the visible label. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  maxLength?: number;
};

/**
 * The text blank of the rule sentence, typed in place: a pill in the look of a `value` token that
 * grows with what is typed (up to the line) and shows it in capitals, as the rule will store it.
 * The border is the focus ring, like every field.
 */
export function SentenceInput({
  label,
  value,
  onChange,
  invalid = false,
  placeholder,
  maxLength,
}: SentenceInputProps) {
  return (
    <TextField
      aria-label={label}
      value={value}
      onChange={onChange}
      isInvalid={invalid || undefined}
      maxLength={maxLength}
      autoComplete="off"
      className="inline-flex max-w-full"
    >
      <Input
        placeholder={placeholder}
        spellCheck={false}
        className="field-ring h-ctl-touch max-w-full min-w-32 rounded-capsule border border-fg-tertiary bg-glass px-s16 text-list text-fg-primary uppercase outline-none field-sizing-content placeholder:text-fg-tertiary placeholder:normal-case lg:h-ctl-tab"
      />
    </TextField>
  );
}
