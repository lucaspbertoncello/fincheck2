import type { CategoryOption } from '@fincheck/ui';

import type {
  InstallmentCreateErrors,
  InstallmentCreateValues,
  InstallmentPreview,
} from '#/features/transactions/transaction-creation/installment-create/types/installment-create-form.type.ts';

import type { AccountChipOption } from '#/shared/types/account/account-chip-option.type.ts';

export type InstallmentCreateViewProps = {
  isOpen: boolean;
  onClose: () => void;
  values: InstallmentCreateValues;
  onChange: (patch: Partial<InstallmentCreateValues>) => void;
  errors: InstallmentCreateErrors;
  formError?: string;
  cards: AccountChipOption[];
  /** Expense categories, most used first. */
  categories: CategoryOption[];
  invoiceMonths: { id: string; label: string }[];
  /** Null until the form is valid enough to show the installments. */
  preview: InstallmentPreview | null;
  loading: boolean;
  saving: boolean;
  onSubmit: () => void;
};
