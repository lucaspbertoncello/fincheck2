import { createBillRequestSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import { useToast } from '@fincheck/ui';
import { useState } from 'react';

import { useBill } from '#/domain/bills/bill/hooks/use-bill.hook.ts';
import { useBillCounterparties } from '#/domain/bills/bill/hooks/use-bill-counterparties.hook.ts';
import { useCreateBill } from '#/domain/bills/bill/hooks/use-create-bill.hook.ts';
import { useDeleteBill } from '#/domain/bills/bill/hooks/use-delete-bill.hook.ts';
import { usePaymentCandidatesForNewBill } from '#/domain/bills/bill/hooks/use-payment-candidates-for-new-bill.hook.ts';
import { useUpdateBill } from '#/domain/bills/bill/hooks/use-update-bill.hook.ts';
import type { DebtFormErrors, DebtMode } from '#/features/bills/debt-form/debt-form.model.ts';
import { DebtFormView } from '#/features/bills/debt-form/debt-form.view.tsx';
import { useBillSearch } from '#/features/bills/hooks/use-bill-search.hook.ts';
import {
  NO_CATEGORY_ID,
  useCategoryOptions,
} from '#/features/bills/hooks/use-category-options.hook.ts';
import { INVALID_FIELD_OR_DATE_SEGMENT_SELECTOR } from '#/shared/constants/form/invalid-field-selector.constant.ts';
import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';
import { buildCandidateOptions } from '#/features/bills/utils/build-candidate-options.util.ts';
import { collectFieldErrors } from '#/shared/utils/forms/collect-field-errors.util.ts';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';

const MESSAGES = {
  counterparty: 'Diga quem é',
  description: 'Diga o que foi',
  amountCents: 'Informe um valor maior que zero',
  dueOn: 'Informe a data completa ou deixe em branco',
};

const BELOW_PAID_MESSAGE = 'O valor não pode ficar abaixo do que já foi pago';

type DebtFormProps = {
  /** The debt being edited; leave out to create. */
  bill?: Bill.Dto;
  /** New debt only: the person already filled in (the "Nova dívida" of a person on the Amigos tab). */
  initialPerson?: string;
  onClose: () => void;
};

function DebtForm({ bill, initialPerson, onClose }: DebtFormProps) {
  const isEdit = bill !== undefined;
  const [mode, setMode] = useState<DebtMode>(bill?.direction === 'receivable' ? 'owed' : 'owe');
  const [counterparty, setCounterparty] = useState(bill?.counterparty ?? initialPerson ?? '');
  const [description, setDescription] = useState(bill?.description ?? '');
  const [amountCents, setAmountCents] = useState(bill?.amountCents ?? 0);
  const [dueOn, setDueOn] = useState(bill?.dueOn ?? '');
  const [categoryId, setCategoryId] = useState(bill?.categoryId ?? NO_CATEGORY_ID);
  const [pixId, setPixId] = useState<string | null>(null);
  const [originId, setOriginId] = useState<string | null>(null);
  const [errors, setErrors] = useState<DebtFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { showUndoToast } = useToast();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();
  const deleteBill = useDeleteBill();
  const names = useBillCounterparties();
  const categoryOptions = useCategoryOptions('expense');
  const name = counterparty.trim();
  const [attempt, setAttempt] = useState(0);
  useFocusFirstInvalid({
    attempt,
    selector: INVALID_FIELD_OR_DATE_SEGMENT_SELECTOR,
    scope: 'dialog',
  });

  // Editing changes the debt itself: the Pix and the transaction paid are linked only when it is made.
  const pixQuery = usePaymentCandidatesForNewBill(
    {
      direction: mode === 'owe' ? 'payable' : 'receivable',
      counterparty: name || undefined,
    },
    { enabled: !isEdit },
  );
  const originQuery = usePaymentCandidatesForNewBill(
    { direction: 'payable' },
    { enabled: mode === 'owed' && !isEdit },
  );
  const pixOptions = buildCandidateOptions(pixQuery.data?.items ?? []);
  const originOptions = buildCandidateOptions(originQuery.data?.items ?? []);
  const selectedPix = pixOptions.find((option) => option.transactionId === pixId) ?? null;
  const selectedOrigin = originOptions.find((option) => option.transactionId === originId) ?? null;

  function changeMode(next: DebtMode) {
    setMode(next);
    setPixId(null); // the Pix candidates are of the other direction
    setOriginId(null);
  }

  function selectOrigin(next: string | null) {
    setOriginId(next);
    const option = originOptions.find((entry) => entry.transactionId === next);
    if (option) setAmountCents(Math.round(option.amountCents / 2)); // half is the usual split; editable
  }

  async function save(current: Bill.Dto, saved: Bill.CreateRequest) {
    const previous = {
      description: current.description,
      counterparty: current.counterparty ?? undefined,
      amountCents: current.amountCents,
      dueOn: current.dueOn,
      ...(current.direction === 'payable' ? { categoryId: current.categoryId } : {}),
    };
    await updateBill.mutateAsync({
      id: current.id,
      body: {
        description: saved.description,
        counterparty: saved.counterparty,
        amountCents: saved.amountCents,
        dueOn: saved.dueOn ?? null,
        // A reimbursement has no category (the API refuses one).
        ...(mode === 'owe' ? { categoryId: saved.categoryId ?? null } : {}),
      },
    });
    showUndoToast({
      message: `Dívida "${saved.description}" salva.`,
      withIcon: true,
      onUndo: () => updateBill.mutate({ id: current.id, body: previous }),
    });
  }

  async function create(saved: Bill.CreateRequest) {
    const created = await createBill.mutateAsync(saved);
    showUndoToast({
      message: `Dívida "${created.description}" criada.`,
      withIcon: true,
      onUndo: () => deleteBill.mutate(created.id),
    });
  }

  async function submit() {
    if (createBill.isPending || updateBill.isPending) return;
    setSubmitError(null);
    const parsed = createBillRequestSchema.safeParse({
      direction: mode === 'owe' ? 'payable' : 'receivable',
      kind: 'friend',
      description,
      counterparty: name || undefined,
      amountCents,
      dueOn: dueOn || undefined,
      categoryId: mode === 'owe' && categoryId !== NO_CATEGORY_ID ? categoryId : undefined,
      origin:
        !isEdit && mode === 'owed' && selectedOrigin
          ? { transactionId: selectedOrigin.transactionId, amountCents }
          : undefined,
      payment: !isEdit && selectedPix ? { transactionId: selectedPix.transactionId } : undefined,
    });
    const found: Record<string, string> = parsed.success
      ? {}
      : collectFieldErrors(parsed.error, MESSAGES);
    if (parsed.success && selectedOrigin && amountCents > selectedOrigin.amountCents) {
      found['amountCents'] = 'A parte do amigo passa do valor da transação que você pagou';
    }
    if (bill && amountCents < bill.paidCents) found['amountCents'] = BELOW_PAID_MESSAGE;
    if (!parsed.success || Object.keys(found).length > 0) {
      setErrors(found);
      setAttempt((count) => count + 1);
      return;
    }
    setErrors({});

    try {
      if (bill) await save(bill, parsed.data);
      else await create(parsed.data);
      onClose();
    } catch (error) {
      setSubmitError(describeApiError(error));
    }
  }

  return (
    <DebtFormView
      isOpen
      onClose={onClose}
      isEdit={isEdit}
      mode={mode}
      onModeChange={changeMode}
      counterparty={counterparty}
      onCounterpartyChange={setCounterparty}
      counterpartySuggestions={(names.data?.items ?? []).map((item) => item.name).slice(0, 6)}
      description={description}
      onDescriptionChange={setDescription}
      amountCents={amountCents}
      onAmountChange={setAmountCents}
      dueOn={dueOn}
      onDueOnChange={setDueOn}
      categories={
        mode === 'owe'
          ? { options: categoryOptions, value: categoryId, onChange: setCategoryId }
          : null
      }
      origin={
        mode === 'owed'
          ? {
              options: originOptions,
              selected: originId,
              onSelect: selectOrigin,
              isLoading: originQuery.isPending,
            }
          : null
      }
      pix={{
        options: pixOptions,
        selected: pixId,
        onSelect: setPixId,
        isLoading: pixQuery.isPending,
      }}
      note={{
        mode,
        name,
        pixCents: selectedPix?.amountCents ?? null,
        remainingCents: Math.max(0, amountCents - (selectedPix?.amountCents ?? 0)),
      }}
      errors={errors}
      submitError={submitError}
      isSaving={createBill.isPending || updateBill.isPending}
      onSubmit={() => void submit()}
    />
  );
}

function DebtEditForm({ debtId, onClose }: { debtId: string; onClose: () => void }) {
  const query = useBill(debtId);
  // A debt that came from a transaction is edited (and undone) in that transaction, not here.
  if (!query.data || query.data.kind !== 'friend' || query.data.origin) return null;
  return <DebtForm key={query.data.id} bill={query.data} onClose={onClose} />;
}

/**
 * "Dívida com amigo", "Eu devo" and "Me devem", to create and to edit. Opens with `?new=debt` in
 * the URL (what the "+" sets; `?friend=<name>` fills in the person) or `?debt=<billId>` to edit,
 * and closes by dropping the param.
 */
export function DebtFormModal() {
  const { newModal, friendName, debtId, closeNewModal, closeEditDebt } = useBillSearch();
  if (debtId) return <DebtEditForm debtId={debtId} onClose={closeEditDebt} />;
  if (newModal !== 'debt') return null;
  return <DebtForm initialPerson={friendName ?? undefined} onClose={closeNewModal} />;
}
