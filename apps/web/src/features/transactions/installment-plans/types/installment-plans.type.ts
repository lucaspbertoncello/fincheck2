import type { IconName } from '@fincheck/ui';

/** One installment of a plan, under the open row. */
type InstallmentLineData = {
  number: number;
  /** "05/06". */
  dateLabel: string;
  /** "3/10 · fatura de jun/26". */
  label: string;
  cents: number;
  /** The one the card charges next. */
  isNext: boolean;
};

/** One plan of the card, ready to draw. */
export type InstallmentPlanRowData = {
  id: string;
  name: string;
  icon: IconName;
  /** No category: the icon has the dashed border. */
  uncategorized: boolean;
  /** "Parcela 3 de 10 · primeira fatura mai/26". */
  detail: string;
  totalCents: number;
  remainingCents: number;
  isSettled: boolean;
  /** A plan of the bank: no edit, no delete. */
  isFromBank: boolean;
  installments: readonly InstallmentLineData[];
};

export type InstallmentPlansViewProps = {
  state: 'loading' | 'error' | 'not-found' | 'ready';
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  onRetry: () => void;
  onBack: () => void;
  onCreate: () => void;
  /** An action that failed (delete), shown at the top. */
  actionError: string | null;
  onDismissActionError: () => void;
  active: readonly InstallmentPlanRowData[];
  settled: readonly InstallmentPlanRowData[];
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
  deleteTarget: { name: string; installmentCount: number } | null;
  deleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};
