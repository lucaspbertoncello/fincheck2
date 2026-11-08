import { createBillRequestSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import { createRecurrenceRequestSchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useBill } from '#/domain/bills/bill/hooks/use-bill.hook.ts';
import { useCreateBill } from '#/domain/bills/bill/hooks/use-create-bill.hook.ts';
import { useDeleteBill } from '#/domain/bills/bill/hooks/use-delete-bill.hook.ts';
import { useUpdateBill } from '#/domain/bills/bill/hooks/use-update-bill.hook.ts';
import { useCreateRecurrence } from '#/domain/recurrences/recurrence/hooks/use-create-recurrence.hook.ts';
import { useDeleteRecurrence } from '#/domain/recurrences/recurrence/hooks/use-delete-recurrence.hook.ts';
import { BillFormView } from '#/features/bills/bill-form/bill-form.view.tsx';
import type {
  BillDirection,
  BillFormErrors,
  BillRepeat,
} from '#/features/bills/bill-form/bill-form.model.ts';
import { useBillSearch } from '#/features/bills/hooks/use-bill-search.hook.ts';
import {
  NO_CATEGORY_ID,
  useCategoryOptions,
} from '#/features/bills/hooks/use-category-options.hook.ts';
import { INVALID_FIELD_OR_DATE_SEGMENT_SELECTOR } from '#/shared/constants/form/invalid-field-selector.constant.ts';
import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';
import { collectFieldErrors } from '#/shared/utils/forms/collect-field-errors.util.ts';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

const MESSAGES = {
  amountCents: 'Informe um valor maior que zero',
  description: 'Diga o que é a conta',
  dueOn: 'Informe a data completa ou deixe em branco',
  categoryId: 'Escolha uma categoria da lista',
};

const MONTHLY_DUE_MESSAGE = 'Para repetir todo mês, escolha o dia do vencimento';

type BillFormProps = {
  /** The bill being edited; leave out to create. */
  bill?: Bill.Dto;
  onClose: () => void;
};

function BillForm({ bill, onClose }: BillFormProps) {
  const isEdit = bill !== undefined;
  const [direction, setDirection] = useState<BillDirection>(bill?.direction ?? 'payable');
  const [amountCents, setAmountCents] = useState(bill?.amountCents ?? 0);
  const [description, setDescription] = useState(bill?.description ?? '');
  const [counterparty, setCounterparty] = useState(bill?.counterparty ?? '');
  const [dueOn, setDueOn] = useState(bill?.dueOn ?? '');
  const [categoryId, setCategoryId] = useState(bill?.categoryId ?? NO_CATEGORY_ID);
  const [repeat, setRepeat] = useState<BillRepeat>('once');
  const [errors, setErrors] = useState<BillFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useFocusFirstInvalid({
    attempt,
    selector: INVALID_FIELD_OR_DATE_SEGMENT_SELECTOR,
    scope: 'dialog',
  });

  const { showUndoToast } = useToast();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const createRecurrence = useCreateRecurrence();
  const deleteRecurrence = useDeleteRecurrence();
  const categories = useCategoryOptions(direction === 'payable' ? 'expense' : 'income');
  const isSaving =
    createBill.isPending ||
    updateBill.isPending ||
    createRecurrence.isPending ||
    deleteBill.isPending;

  function changeDirection(next: BillDirection) {
    setDirection(next);
    setCategoryId(NO_CATEGORY_ID); // the category types differ: an old choice would not fit
  }

  const chosenCategory = categoryId === NO_CATEGORY_ID ? undefined : categoryId;
  const person = counterparty.trim() || undefined;

  async function createMonthly() {
    const parsed = createRecurrenceRequestSchema.safeParse({
      kind: direction === 'payable' ? 'expense' : 'income',
      name: description,
      expectedAmountCents: amountCents,
      counterparty: person,
      categoryId: chosenCategory,
      dateRule: { type: 'fixed_day', day: Number(dueOn.slice(8, 10)) },
      startsMonth: dueOn.slice(0, 7),
    });
    if (!parsed.success) {
      setErrors(
        collectFieldErrors(parsed.error, {
          ...MESSAGES,
          name: MESSAGES.description,
          expectedAmountCents: MESSAGES.amountCents,
        }),
      );
      return false;
    }
    const created = await createRecurrence.mutateAsync(parsed.data);
    showUndoToast({
      message: `Recorrência "${created.recurrence.name}" criada.`,
      withIcon: true,
      onUndo: () => deleteRecurrence.mutate(created.recurrence.id),
    });
    return true;
  }

  async function createOnce() {
    const parsed = createBillRequestSchema.safeParse({
      direction,
      kind: 'general',
      description,
      counterparty: person,
      amountCents,
      dueOn: dueOn || undefined,
      categoryId: chosenCategory,
    });
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error, MESSAGES));
      return false;
    }
    const created = await createBill.mutateAsync(parsed.data);
    showUndoToast({
      message: `Conta "${created.description}" criada.`,
      withIcon: true,
      onUndo: () => deleteBill.mutate(created.id),
    });
    return true;
  }

  async function save() {
    if (!bill) return false;
    const previous = {
      description: bill.description,
      counterparty: bill.counterparty ?? undefined,
      amountCents: bill.amountCents,
      dueOn: bill.dueOn,
      categoryId: bill.categoryId,
    };
    const check = createBillRequestSchema.safeParse({
      direction,
      kind: 'general',
      description,
      amountCents,
      dueOn: dueOn || undefined,
      categoryId: chosenCategory,
    });
    if (!check.success) {
      setErrors(collectFieldErrors(check.error, MESSAGES));
      return false;
    }
    await updateBill.mutateAsync({
      id: bill.id,
      body: {
        description: check.data.description,
        counterparty: person,
        amountCents,
        dueOn: dueOn || null,
        categoryId: chosenCategory ?? null,
      },
    });
    showUndoToast({
      message: `Conta "${check.data.description}" salva.`,
      withIcon: true,
      onUndo: () => updateBill.mutate({ id: bill.id, body: previous }),
    });
    return true;
  }

  async function submit() {
    if (isSaving) return;
    setAttempt((count) => count + 1); // a refused form sends the focus to the first invalid field
    setSubmitError(null);
    setErrors({});
    if (!isEdit && repeat === 'monthly' && !dueOn) {
      setErrors({ dueOn: MONTHLY_DUE_MESSAGE });
      return;
    }

    try {
      const saved = isEdit
        ? await save()
        : repeat === 'monthly'
          ? await createMonthly()
          : await createOnce();
      if (saved) onClose();
    } catch (error) {
      setSubmitError(describeApiError(error));
    }
  }

  async function remove() {
    if (!bill || isSaving) return;
    setSubmitError(null);
    try {
      await deleteBill.mutateAsync(bill.id);
      showUndoToast({
        message: `Conta "${bill.description}" excluída.`,
        withIcon: true,
        onUndo: () =>
          createBill.mutate({
            direction: bill.direction,
            kind: bill.kind,
            description: bill.description,
            counterparty: bill.counterparty ?? undefined,
            amountCents: bill.amountCents,
            dueOn: bill.dueOn ?? undefined,
            categoryId: bill.categoryId ?? undefined,
          }),
      });
      onClose();
    } catch (error) {
      setSubmitError(describeApiError(error));
    }
  }

  return (
    <BillFormView
      isOpen
      onClose={onClose}
      isEdit={isEdit}
      direction={direction}
      onDirectionChange={changeDirection}
      amountCents={amountCents}
      onAmountChange={setAmountCents}
      description={description}
      onDescriptionChange={setDescription}
      counterparty={counterparty}
      onCounterpartyChange={setCounterparty}
      dueOn={dueOn}
      onDueOnChange={setDueOn}
      categories={categories}
      categoryId={categoryId}
      onCategoryChange={setCategoryId}
      repeat={isEdit ? null : { value: repeat, onChange: setRepeat }}
      errors={errors}
      dueDateText={dueOn ? formatDayMonth(dueOn) : null}
      submitError={submitError}
      isSaving={isSaving}
      onSubmit={() => void submit()}
      onDelete={isEdit ? () => void remove() : null}
    />
  );
}

function BillEditForm({ billId, onClose }: { billId: string; onClose: () => void }) {
  const query = useBill(billId);
  if (!query.data || query.data.kind !== 'general') return null;
  return <BillForm key={query.data.id} bill={query.data} onClose={onClose} />;
}

/**
 * "Nova conta a pagar ou receber" and "Editar conta", the same modal. Opens with `?new=bill` (what
 * the "+" sets) or `?edit=<billId>` and closes by dropping the param.
 */
export function BillFormModal() {
  const { newModal, editBillId, closeNewModal, closeEditBill } = useBillSearch();
  if (editBillId) return <BillEditForm billId={editBillId} onClose={closeEditBill} />;
  if (newModal !== 'bill') return null;
  return <BillForm onClose={closeNewModal} />;
}
