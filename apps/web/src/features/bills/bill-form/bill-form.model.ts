import type { CategoryOption } from '@fincheck/ui';

export type BillDirection = 'payable' | 'receivable';

/** "Só esta vez" creates a bill; "Todo mês" creates a monthly recurrence on the due day. */
export type BillRepeat = 'once' | 'monthly';

export type BillFormErrors = {
  amountCents?: string;
  description?: string;
  dueOn?: string;
  categoryId?: string;
};

export type BillFormViewProps = {
  isOpen: boolean;
  onClose: () => void;
  /** The same modal creates and edits: only the words and the delete action change. */
  isEdit: boolean;
  direction: BillDirection;
  onDirectionChange: (direction: BillDirection) => void;
  amountCents: number;
  onAmountChange: (cents: number) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  counterparty: string;
  onCounterpartyChange: (name: string) => void;
  dueOn: string;
  onDueOnChange: (date: string) => void;
  /** The categories of the type that matches the direction, "Sem categoria" first. */
  categories: CategoryOption[];
  /** The chosen id, or the "no category" id. */
  categoryId: string;
  onCategoryChange: (id: string) => void;
  /** Creation only: the bill can instead repeat every month. */
  repeat: { value: BillRepeat; onChange: (repeat: BillRepeat) => void } | null;
  errors: BillFormErrors;
  /** `dd/mm` of the due date once it is complete: the hint says when the bill enters the Livre. */
  dueDateText: string | null;
  submitError: string | null;
  isSaving: boolean;
  onSubmit: () => void;
  /** Edit only. */
  onDelete: (() => void) | null;
};
