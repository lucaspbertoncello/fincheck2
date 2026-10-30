import type { CategoryOption } from '@fincheck/ui';
import type { RefObject } from 'react';

export type BillDirection = 'payable' | 'receivable';

export type BillCreateErrors = {
  amountCents?: string;
  description?: string;
  dueOn?: string;
  categoryId?: string;
};

export type BillCreateViewProps = {
  formRef: RefObject<HTMLFormElement | null>;
  isOpen: boolean;
  onClose: () => void;
  direction: BillDirection;
  onDirectionChange: (direction: BillDirection) => void;
  amountCents: number;
  onAmountChange: (cents: number) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  dueOn: string;
  onDueOnChange: (date: string) => void;
  /** The categories of the type that matches the direction, "Sem categoria" first. */
  categories: CategoryOption[];
  /** The chosen id, or the "no category" id. */
  categoryId: string;
  onCategoryChange: (id: string) => void;
  errors: BillCreateErrors;
  /** `dd/mm` of the due date once it is complete: the note says when the bill enters the Livre. */
  dueDateText: string | null;
  submitError: string | null;
  isSaving: boolean;
  onSubmit: () => void;
};
