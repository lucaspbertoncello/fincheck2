import { createBillRequestSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { useToast } from '@fincheck/ui';
import { useRef, useState } from 'react';

import { useBillCounterparties } from '#/domain/bills/bill/hooks/use-bill-counterparties.hook.ts';
import { useCreateBill } from '#/domain/bills/bill/hooks/use-create-bill.hook.ts';
import { useDeleteBill } from '#/domain/bills/bill/hooks/use-delete-bill.hook.ts';
import { usePaymentCandidatesForNewBill } from '#/domain/bills/bill/hooks/use-payment-candidates-for-new-bill.hook.ts';
import type { DebtCreateErrors, DebtMode } from '#/features/bills/debt-create/debt-create.model.ts';
import { DebtCreateView } from '#/features/bills/debt-create/debt-create.view.tsx';
import { useBillSearch } from '#/features/bills/hooks/use-bill-search.hook.ts';
import {
  NO_CATEGORY_ID,
  useCategoryOptions,
} from '#/features/bills/hooks/use-category-options.hook.ts';
import { useFocusFirstInvalid } from '#/features/bills/hooks/use-focus-first-invalid.hook.ts';
import { buildCandidateOptions } from '#/features/bills/utils/build-candidate-options.util.ts';
import { collectFieldErrors } from '#/features/bills/utils/collect-field-errors.util.ts';
import { describeApiError } from '#/features/bills/utils/describe-api-error.util.ts';

const MESSAGES = {
  counterparty: 'Diga quem é',
  description: 'Diga o que foi',
  amountCents: 'Informe um valor maior que zero',
  dueOn: 'Informe a data completa ou deixe em branco',
};

function DebtCreateForm({ onClose }: { onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<DebtMode>('owe');
  const [counterparty, setCounterparty] = useState('');
  const [description, setDescription] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [dueOn, setDueOn] = useState('');
  const [categoryId, setCategoryId] = useState(NO_CATEGORY_ID);
  const [pixId, setPixId] = useState<string | null>(null);
  const [originId, setOriginId] = useState<string | null>(null);
  const [errors, setErrors] = useState<DebtCreateErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { showUndoToast } = useToast();
  const createBill = useCreateBill();
  const deleteBill = useDeleteBill();
  const names = useBillCounterparties();
  const categoryOptions = useCategoryOptions('expense');
  const name = counterparty.trim();

  const pixQuery = usePaymentCandidatesForNewBill({
    direction: mode === 'owe' ? 'payable' : 'receivable',
    counterparty: name || undefined,
  });
  const originQuery = usePaymentCandidatesForNewBill(
    { direction: 'payable' },
    { enabled: mode === 'owed' },
  );
  const pixOptions = buildCandidateOptions(pixQuery.data?.items ?? []);
  const originOptions = buildCandidateOptions(originQuery.data?.items ?? []);
  const selectedPix = pixOptions.find((option) => option.transactionId === pixId) ?? null;
  const selectedOrigin = originOptions.find((option) => option.transactionId === originId) ?? null;

  useFocusFirstInvalid(formRef, attempt);

  function changeMode(next: DebtMode) {
    setMode(next);
    setPixId(null); // the Pix candidates are of the other direction
    setOriginId(null);
  }

  function selectOrigin(next: string | null) {
    setOriginId(next);
    const option = originOptions.find((entry) => entry.transactionId === next);
    if (option && amountCents === 0) setAmountCents(option.amountCents);
  }

  async function submit() {
    if (createBill.isPending) return;
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
        mode === 'owed' && selectedOrigin
          ? { transactionId: selectedOrigin.transactionId, amountCents }
          : undefined,
      payment: selectedPix ? { transactionId: selectedPix.transactionId } : undefined,
    });
    const found: Record<string, string> = parsed.success
      ? {}
      : collectFieldErrors(parsed.error, MESSAGES);
    if (parsed.success && selectedOrigin && amountCents > selectedOrigin.amountCents) {
      found['amountCents'] = 'A parte do amigo passa do valor da transação que você pagou';
    }
    if (!parsed.success || Object.keys(found).length > 0) {
      setErrors(found);
      setAttempt((count) => count + 1);
      return;
    }
    setErrors({});

    try {
      const bill = await createBill.mutateAsync(parsed.data);
      showUndoToast({
        message: `Dívida "${bill.description}" criada.`,
        withIcon: true,
        onUndo: () => deleteBill.mutate(bill.id),
      });
      onClose();
    } catch (error) {
      setSubmitError(describeApiError(error));
    }
  }

  return (
    <DebtCreateView
      formRef={formRef}
      isOpen
      onClose={onClose}
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
      isSaving={createBill.isPending}
      onSubmit={() => void submit()}
    />
  );
}

/**
 * "Dívida com amigo", "Eu devo" and "Me devem". Opens with `?new=debt` in the URL (what the "+"
 * sets) and closes by dropping the param.
 */
export function DebtCreateModal() {
  const { newModal, closeNewModal } = useBillSearch();
  if (newModal !== 'debt') return null;
  return <DebtCreateForm onClose={closeNewModal} />;
}
