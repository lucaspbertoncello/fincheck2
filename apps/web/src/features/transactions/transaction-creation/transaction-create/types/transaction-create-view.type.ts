import type { CategoryOption } from '@fincheck/ui';

import type { AccountChipOption } from '#/shared/components/accounts/account-chips.component.tsx';

import type {
  TransactionCreateErrors,
  TransactionCreateValues,
} from '#/features/transactions/transaction-creation/transaction-create/types/transaction-create-form.type.ts';

export type TransactionCreateViewProps = {
  isOpen: boolean;
  onClose: () => void;
  values: TransactionCreateValues;
  onChange: (patch: Partial<TransactionCreateValues>) => void;
  errors: TransactionCreateErrors;
  /** Server error that belongs to no field. */
  formError?: string;
  accounts: AccountChipOption[];
  methods: { id: string; label: string }[];
  /** The categories of the chosen type, most used first. */
  categories: CategoryOption[];
  /** The accounts or categories are still loading. */
  loading: boolean;
  saving: boolean;
  onSubmit: () => void;
};
