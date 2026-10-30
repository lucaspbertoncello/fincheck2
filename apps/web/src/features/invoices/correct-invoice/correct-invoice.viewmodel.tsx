import { updateInvoiceRequestSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { useState } from 'react';

import { useAccountsSearch } from '#/features/accounts/account-search/hooks/use-accounts-search.hook.ts';
import { useCorrectInvoiceModel } from '#/features/invoices/correct-invoice/correct-invoice.model.ts';
import { CorrectInvoiceView } from '#/features/invoices/correct-invoice/correct-invoice.view.tsx';
import { splitInvoiceTarget } from '#/features/invoices/invoice-summary/utils/split-invoice-target.util.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

/** "Corrigir valor" of an invoice (BR-INV-004). Opens by `?correct=<cardId>:<YYYY-MM>`. */
export function CorrectInvoiceViewModel() {
  const { search, update } = useAccountsSearch();
  const target = splitInvoiceTarget(search.correct);
  const model = useCorrectInvoiceModel(target);
  // `null` until the person types: the field then shows the value in use.
  const [typedCents, setTypedCents] = useState<number | null>(null);
  const [typedNote, setTypedNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const invoice = model.invoice;
  const cents = typedCents ?? Math.max(0, invoice?.totalCents ?? 0);
  const note = typedNote ?? invoice?.overrideNote ?? '';

  function close() {
    setTypedCents(null);
    setTypedNote(null);
    setError(null);
    setSubmitError(null);
    update({ correct: undefined });
  }

  function save(body: unknown) {
    if (!target) return;
    const parsed = updateInvoiceRequestSchema.safeParse(body);
    if (!parsed.success) {
      setError('A observação tem até 200 letras');
      setFailedAttempts((count) => count + 1);
      return;
    }
    setError(null);
    setSubmitError(null);
    model.update.mutate(
      { ...target, body: parsed.data },
      {
        onSuccess: close,
        onError: () => setSubmitError('Não deu para salvar a correção. Tente de novo.'),
      },
    );
  }

  return (
    <CorrectInvoiceView
      isOpen={Boolean(search.correct)}
      onClose={close}
      state={model.isLoading ? 'loading' : model.isError ? 'error' : 'ready'}
      onRetry={model.retry}
      referenceLines={
        invoice
          ? [
              invoice.bankTotalCents === null
                ? null
                : `O banco informou ${formatMoney(invoice.bankTotalCents)}.`,
              `O app calculou ${formatMoney(invoice.computedTotalCents)} pelas compras e parcelas.`,
            ].filter((line): line is string => line !== null)
          : []
      }
      cents={cents}
      onCentsChange={setTypedCents}
      note={note}
      onNoteChange={setTypedNote}
      error={error ?? undefined}
      failedAttempts={failedAttempts}
      submitError={submitError}
      isSaving={model.update.isPending}
      canRemove={invoice?.totalOverrideCents !== null && invoice?.totalOverrideCents !== undefined}
      onSave={() =>
        save({ totalOverrideCents: cents, overrideNote: note.trim() === '' ? null : note.trim() })
      }
      onRemove={() => save({ totalOverrideCents: null })}
    />
  );
}
