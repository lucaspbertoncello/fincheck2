import type { CategoryOption } from '@fincheck/ui';

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
  accounts: { id: string; name: string }[];
  methods: { id: string; label: string }[];
  categories: CategoryOption[];
  /** The accounts or categories are still loading. */
  loading: boolean;
  saving: boolean;
  onSubmit: () => void;
};
