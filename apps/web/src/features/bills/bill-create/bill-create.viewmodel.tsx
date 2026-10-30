import { createBillRequestSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { useToast } from '@fincheck/ui';
import { useRef, useState } from 'react';

import { useCreateBill } from '#/domain/bills/bill/hooks/use-create-bill.hook.ts';
import { useDeleteBill } from '#/domain/bills/bill/hooks/use-delete-bill.hook.ts';
import { BillCreateView } from '#/features/bills/bill-create/bill-create.view.tsx';
import type {
  BillCreateErrors,
  BillDirection,
} from '#/features/bills/bill-create/bill-create.model.ts';
import { useBillSearch } from '#/features/bills/hooks/use-bill-search.hook.ts';
import {
  NO_CATEGORY_ID,
  useCategoryOptions,
} from '#/features/bills/hooks/use-category-options.hook.ts';
import { useFocusFirstInvalid } from '#/features/bills/hooks/use-focus-first-invalid.hook.ts';
import { collectFieldErrors } from '#/features/bills/utils/collect-field-errors.util.ts';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

const MESSAGES = {
  amountCents: 'Informe um valor maior que zero',
  description: 'Diga o que é a conta',
  dueOn: 'Informe a data completa ou deixe em branco',
  categoryId: 'Escolha uma categoria da lista',
};

function BillCreateForm({ onClose }: { onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [direction, setDirection] = useState<BillDirection>('payable');
  const [amountCents, setAmountCents] = useState(0);
  const [description, setDescription] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [categoryId, setCategoryId] = useState(NO_CATEGORY_ID);
  const [errors, setErrors] = useState<BillCreateErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { showUndoToast } = useToast();
  const createBill = useCreateBill();
  const deleteBill = useDeleteBill();
  const categories = useCategoryOptions(direction === 'payable' ? 'expense' : 'income');
  useFocusFirstInvalid(formRef, attempt);

  function changeDirection(next: BillDirection) {
    setDirection(next);
    setCategoryId(NO_CATEGORY_ID); // the category types differ: an old choice would not fit
  }

  async function submit() {
    if (createBill.isPending) return;
    setSubmitError(null);
    const parsed = createBillRequestSchema.safeParse({
      direction,
      kind: 'general',
      description,
      amountCents,
      dueOn: dueOn || undefined,
      categoryId: categoryId === NO_CATEGORY_ID ? undefined : categoryId,
    });
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error, MESSAGES));
      setAttempt((count) => count + 1);
      return;
    }
    setErrors({});

    try {
      const bill = await createBill.mutateAsync(parsed.data);
      showUndoToast({
        message: `Conta "${bill.description}" criada.`,
        withIcon: true,
        onUndo: () => deleteBill.mutate(bill.id),
      });
      onClose();
    } catch (error) {
      setSubmitError(describeApiError(error));
    }
  }

  return (
    <BillCreateView
      formRef={formRef}
      isOpen
      onClose={onClose}
      direction={direction}
      onDirectionChange={changeDirection}
      amountCents={amountCents}
      onAmountChange={setAmountCents}
      description={description}
      onDescriptionChange={setDescription}
      dueOn={dueOn}
      onDueOnChange={setDueOn}
      categories={categories}
      categoryId={categoryId}
      onCategoryChange={setCategoryId}
      errors={errors}
      dueDateText={dueOn ? formatDayMonth(dueOn) : null}
      submitError={submitError}
      isSaving={createBill.isPending}
      onSubmit={() => void submit()}
    />
  );
}

/**
 * "Nova conta a pagar ou receber". Opens with `?new=bill` in the URL (what the "+" sets) and
 * closes by dropping the param.
 */
export function BillCreateModal() {
  const { newModal, closeNewModal } = useBillSearch();
  if (newModal !== 'bill') return null;
  return <BillCreateForm onClose={closeNewModal} />;
}
