import { INSTITUTIONS } from '@fincheck/shared/accounts/institution/institution.constant.ts';
import { createConnectionRequestSchema } from '@fincheck/shared/sync/connection/connection.schema.ts';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useAccountsSearch } from '#/features/accounts/account-search/hooks/use-accounts-search.hook.ts';
import { MANUAL_ACCOUNT_TYPES } from '#/features/accounts/connect-account/constants/manual-account-types.constant.ts';
import { useConnectAccountModel } from '#/features/accounts/connect-account/connect-account.model.ts';
import { ConnectAccountView } from '#/features/accounts/connect-account/connect-account.view.tsx';
import { useConnectAccountForm } from '#/features/accounts/connect-account/hooks/use-connect-account-form.hook.ts';
import { describeConnectError } from '#/features/accounts/connect-account/utils/describe-connect-error.util.ts';
import { validateManualAccount } from '#/features/accounts/connect-account/utils/validate-manual-account.util.ts';

const TYPE_OPTIONS = MANUAL_ACCOUNT_TYPES.map((item) => ({ value: item.type, label: item.label }));

const INSTITUTION_OPTIONS = [
  ...INSTITUTIONS.map((item) => ({ value: item.code, label: item.name })),
  { value: 'other' as const, label: 'Outro' },
];

const BRAND_OPTIONS = [
  { value: 'visa' as const, label: 'Visa' },
  { value: 'mastercard' as const, label: 'Mastercard' },
  { value: 'elo' as const, label: 'Elo' },
  { value: 'amex' as const, label: 'Amex' },
  { value: 'hipercard' as const, label: 'Hipercard' },
  { value: 'other' as const, label: 'Outra' },
];

/**
 * Modal "Conectar conta" of Contas e cartões. It opens by the URL: `?new=account` on /accounts
 * (the "+" of the top bar and the "Conectar outra conta" card both set it).
 */
export function ConnectAccountViewModel() {
  const { search, update } = useAccountsSearch();
  const navigate = useNavigate();
  const isOpen = search.new === 'account';
  const model = useConnectAccountModel(isOpen);
  const state = useConnectAccountForm();
  const [submitError, setSubmitError] = useState<string | null>(null);

  function close() {
    state.reset();
    setSubmitError(null);
    update({ new: undefined });
  }

  function submitPluggy() {
    const parsed = createConnectionRequestSchema.safeParse({ pluggyItemId: state.itemId.trim() });
    if (!parsed.success) {
      state.showErrors({ itemId: 'O ID do item tem 36 caracteres' });
      return;
    }
    state.clearErrors();
    setSubmitError(null);
    model.createConnection.mutate(parsed.data, {
      onSuccess: close,
      onError: (error) => setSubmitError(describeConnectError(error)),
    });
  }

  function submitManual() {
    const result = validateManualAccount(state.form);
    if (!result.ok) {
      state.showErrors(result.errors);
      return;
    }
    state.clearErrors();
    setSubmitError(null);
    model.createAccount.mutate(result.body, {
      onSuccess: close,
      onError: (error) => setSubmitError(describeConnectError(error)),
    });
  }

  return (
    <ConnectAccountView
      isOpen={isOpen}
      onClose={close}
      mode={state.mode}
      onModeChange={(mode) => {
        state.setMode(mode);
        state.clearErrors();
        setSubmitError(null);
      }}
      isLoadingSettings={model.isLoadingSettings}
      isConfigured={model.isConfigured}
      itemId={state.itemId}
      onItemIdChange={state.setItemId}
      form={state.form}
      onFieldChange={state.setField}
      errors={state.errors}
      failedAttempts={state.failedAttempts}
      submitError={submitError}
      isSubmitting={model.createConnection.isPending || model.createAccount.isPending}
      onSubmit={state.mode === 'pluggy' ? submitPluggy : submitManual}
      onOpenSettings={() => void navigate({ to: '/settings' })}
      typeOptions={TYPE_OPTIONS}
      institutionOptions={INSTITUTION_OPTIONS}
      brandOptions={BRAND_OPTIONS}
    />
  );
}
