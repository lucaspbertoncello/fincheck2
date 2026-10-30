import { adjustBalanceRequestSchema } from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.schema.ts';
import { useState } from 'react';

import { useAccountsSearch } from '#/features/accounts/account-search/hooks/use-accounts-search.hook.ts';
import { useAdjustBalanceModel } from '#/features/accounts/adjust-balance/adjust-balance.model.ts';
import { AdjustBalanceView } from '#/features/accounts/adjust-balance/adjust-balance.view.tsx';
import { describeAdjustError } from '#/features/accounts/adjust-balance/utils/describe-adjust-error.util.ts';
import { resolveAccountTheme } from '#/features/accounts/account-list/utils/resolve-account-theme.util.ts';

/** "Ajustar saldo" (manual account) and "Atualizar saldo" (wallet). Opens by `?adjust=<accountId>`. */
export function AdjustBalanceViewModel() {
  const { search, update } = useAccountsSearch();
  const model = useAdjustBalanceModel(search.adjust);
  // `null` until the person types: the field then shows the current balance.
  const [typedCents, setTypedCents] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentCents = model.account?.balanceCents ?? 0;
  const targetCents = typedCents ?? currentCents;
  const differenceCents = targetCents - currentCents;

  function close() {
    setTypedCents(null);
    setNote('');
    setError(null);
    setSubmitError(null);
    update({ adjust: undefined });
  }

  function submit() {
    if (!model.account || differenceCents === 0) return;
    const parsed = adjustBalanceRequestSchema.safeParse({
      targetBalanceCents: targetCents,
      note: note.trim() === '' ? undefined : note.trim(),
    });
    if (!parsed.success) {
      setError('A observação tem até 200 letras');
      setFailedAttempts((count) => count + 1);
      return;
    }
    setError(null);
    setSubmitError(null);
    model.adjust.mutate(
      { id: model.account.id, body: parsed.data },
      { onSuccess: close, onError: (failure) => setSubmitError(describeAdjustError(failure)) },
    );
  }

  const isWallet = model.account?.type === 'wallet';

  return (
    <AdjustBalanceView
      isOpen={Boolean(search.adjust)}
      onClose={close}
      title={isWallet ? 'Atualizar saldo' : 'Ajustar saldo'}
      accountName={model.account?.name ?? ''}
      accountTheme={
        model.account ? (isWallet ? 'wallet' : resolveAccountTheme(model.account)) : 'fallback'
      }
      isLoading={model.isLoading}
      currentCents={currentCents}
      cents={Math.max(0, targetCents)}
      onCentsChange={setTypedCents}
      differenceCents={differenceCents}
      note={note}
      onNoteChange={setNote}
      error={error ?? undefined}
      failedAttempts={failedAttempts}
      submitError={submitError}
      isSubmitting={model.adjust.isPending}
      onSubmit={submit}
    />
  );
}
