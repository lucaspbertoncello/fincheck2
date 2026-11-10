import type { CategoryOption } from '@fincheck/ui';

import type {
  InstallmentCreateErrors,
  InstallmentCreateValues,
  InstallmentPreview,
} from '#/features/transactions/transaction-creation/installment-create/types/installment-create-form.type.ts';

import type { AccountChipOption } from '#/shared/types/account/account-chip-option.type.ts';

export type InstallmentCreateViewProps = {
  isOpen: boolean;
  /** `create` launches a purchase; `edit` changes one of the plan's own fields. */
  mode: 'create' | 'edit';
  onClose: () => void;
  values: InstallmentCreateValues;
  onChange: (patch: Partial<InstallmentCreateValues>) => void;
  errors: InstallmentCreateErrors;
  formError?: string;
  cards: AccountChipOption[];
  /** The card as text, not a choice (the page of one card, or an edit): its name. */
  lockedCard?: string;
  /** The purchase day as text, `DD/MM/YYYY` (an edit does not move it). */
  lockedPurchaseDate?: string;
  /** Expense categories, most used first. */
  categories: CategoryOption[];
  invoiceMonths: { id: string; label: string }[];
  /** Null until the form is valid enough to show the installments. */
  preview: InstallmentPreview | null;
  /** An edit that changes the total, the count or the first invoice: says the installments are recalculated. */
  showsRecalculation: boolean;
  loading: boolean;
  saving: boolean;
  onSubmit: () => void;
};
