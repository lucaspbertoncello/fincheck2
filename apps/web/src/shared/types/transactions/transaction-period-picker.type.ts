export type TransactionPeriodPickerProps = {
  monthLabel: string;
  yearLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  periodOptions: ReadonlyArray<{ key: string; label: string }>;
  period: string;
  rangeLabel: string | null;
  onPeriodChange: (key: string) => void;
};
