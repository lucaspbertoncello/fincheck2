type PeriodOption = {
  key: string;
  label: string;
};

export type PeriodMenuProps = {
  options: readonly PeriodOption[];
  /** The key of the chosen option. */
  value: string;
  onChange: (key: string) => void;
  /** The key that means "the month of the picker"; any other choice lights the button. */
  monthKey: string;
};
