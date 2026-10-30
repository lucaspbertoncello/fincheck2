import type { CategoryOption } from '@fincheck/ui';

import type {
  InstallmentCreateErrors,
  InstallmentCreateValues,
  InstallmentPreviewRow,
} from '#/features/transactions/transaction-creation/installment-create/types/installment-create-form.type.ts';

export type InstallmentCreateViewProps = {
  isOpen: boolean;
  onClose: () => void;
  values: InstallmentCreateValues;
  onChange: (patch: Partial<InstallmentCreateValues>) => void;
  errors: InstallmentCreateErrors;
  formError?: string;
  cards: { id: string; name: string }[];
  categories: CategoryOption[];
  invoiceMonths: { id: string; label: string }[];
  /** The first rows of the preview and how many there are in all; empty until the form is valid enough. */
  preview: { rows: InstallmentPreviewRow[]; count: number; hiddenCount: number };
  loading: boolean;
  saving: boolean;
  onSubmit: () => void;
};
