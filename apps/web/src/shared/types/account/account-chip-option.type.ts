import type { BankThemeKey, ChoiceOption } from '@fincheck/ui';

export type AccountChipOption = ChoiceOption & {
  /** The bank mark of the chip; "wallet" is the wallet icon. */
  theme: BankThemeKey | 'wallet';
};
