import { TransactionPeriodPicker } from '#/shared/components/transactions/transaction-period-picker.component.tsx';
import { useTransactionPeriodPicker } from '#/shared/hooks/transactions/use-transaction-period-picker.hook.ts';

/** The header picker of Transações, wired to the app month and the `?period=` of the screen. */
export function TransactionPeriodPickerViewModel() {
  return <TransactionPeriodPicker {...useTransactionPeriodPicker()} />;
}
