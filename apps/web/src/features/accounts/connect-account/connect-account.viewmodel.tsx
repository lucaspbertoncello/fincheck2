import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import { INSTITUTIONS } from '@fincheck/shared/accounts/institution/institution.constant.ts';
import { createConnectionRequestSchema } from '@fincheck/shared/sync/connection/connection.schema.ts';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useAccountsSearch } from '#/features/accounts/account-search/hooks/use-accounts-search.hook.ts';
import { MANUAL_ACCOUNT_TYPES } from '#/features/accounts/connect-account/constants/manual-account-types.constant.ts';
import { useConnectAccountModel } from '#/features/accounts/connect-account/connect-account.model.ts';
import { ConnectAccountView } from '#/features/accounts/connect-account/connect-account.view.tsx';
import { useConnectAccountForm } from '#/features/accounts/connect-account/hooks/use-connect-account-form.hook.ts';
import { buildFormFromAccount } from '#/features/accounts/connect-account/utils/build-form-from-account.util.ts';
import {
  connectErrorNeedsSettings,
  describeConnectError,
} from '#/features/accounts/connect-account/utils/describe-connect-error.util.ts';
import { validateAccountEdit } from '#/features/accounts/connect-account/utils/validate-account-edit.util.ts';
import { validateManualAccount } from '#/features/accounts/connect-account/utils/validate-manual-account.util.ts';

const TYPE_OPTIONS = MANUAL_ACCOUNT_TYPES.map((item) => ({
  value: item.type,
  label: item.label,
  icon: item.icon,
}));

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

type SessionProps = {
  isOpen: boolean;
  editId: string | undefined;
  editAccount: Account.Dto | undefined;
  editState: 'loading' | 'error' | 'ready';
  model: ReturnType<typeof useConnectAccountModel>;
  onClose: () => void;
  onDelete: () => void;
};

/**
 * One opening of the modal. The form state starts from the account being edited, so the parent
 * remounts this (by `key`) when the target changes or the account arrives.
 */
function ConnectAccountSession({
  isOpen,
  editId,
  editAccount,
  editState,
  model,
  onClose,
  onDelete,
}: SessionProps) {
  const navigate = useNavigate();
  const state = useConnectAccountForm(editAccount ? buildFormFromAccount(editAccount) : undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<{
    message: string;
    needsSettings: boolean;
  } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isEditing = Boolean(editId);
  const isBankLocked = editAccount?.source === 'pluggy';

  function close() {
    state.reset();
    setSubmitError(null);
    setConnectError(null);
    setIsConnected(false);
    onClose();
  }

  function submitOpenFinance() {
    const parsed = createConnectionRequestSchema.safeParse({ pluggyItemId: state.itemId.trim() });
    if (!parsed.success) {
      state.showErrors({ itemId: 'O código tem 36 caracteres' });
      return;
    }
    state.clearErrors();
    setConnectError(null);
    model.createConnection.mutate(parsed.data, {
      onSuccess: () => setIsConnected(true),
      onError: (error) =>
        setConnectError({
          message: describeConnectError(error),
          needsSettings: connectErrorNeedsSettings(error),
        }),
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

  function submitEdit() {
    if (!editId) return;
    const result = validateAccountEdit(state.form, isBankLocked);
    if (!result.ok) {
      state.showErrors(result.errors);
      return;
    }
    state.clearErrors();
    setSubmitError(null);
    model.updateAccount.mutate(
      { id: editId, body: result.body },
      {
        onSuccess: close,
        onError: () => setSubmitError('Não deu para salvar. Tente de novo.'),
      },
    );
  }

  const submit = isEditing
    ? submitEdit
    : state.mode === 'open-finance'
      ? submitOpenFinance
      : submitManual;

  return (
    <ConnectAccountView
      isOpen={isOpen}
      onClose={close}
      isEditing={isEditing}
      editState={editState}
      onRetry={() => void model.retryEdit()}
      onDelete={onDelete}
      mode={state.mode}
      onModeChange={(mode) => {
        state.setMode(mode);
        state.clearErrors();
        setSubmitError(null);
        setConnectError(null);
      }}
      isLoadingSettings={model.isLoadingSettings}
      isConfigured={model.isConfigured}
      code={state.itemId}
      onCodeChange={state.setItemId}
      isConnected={isConnected}
      onConnectAnother={() => {
        state.setItemId('');
        setConnectError(null);
        setIsConnected(false);
      }}
      connectError={connectError}
      form={state.form}
      onFieldChange={state.setField}
      errors={state.errors}
      failedAttempts={state.failedAttempts}
      submitError={submitError}
      isSubmitting={
        model.createConnection.isPending ||
        model.createAccount.isPending ||
        model.updateAccount.isPending
      }
      onSubmit={submit}
      onOpenSettings={() => void navigate({ to: '/settings/connections' })}
      isBankLocked={isBankLocked}
      typeOptions={TYPE_OPTIONS}
      institutionOptions={INSTITUTION_OPTIONS}
      brandOptions={BRAND_OPTIONS}
    />
  );
}

/**
 * Modal "Conectar conta" of Contas e cartões, which also edits. It opens by the URL: `?new=account`
 * (the "+" of the top bar and the "Conectar outra conta" card) to connect, `?edit=<accountId>`
 * (the "…" menu of an account or card) to edit.
 */
export function ConnectAccountViewModel() {
  const { search, update } = useAccountsSearch();
  const isCreating = search.new === 'account';
  const model = useConnectAccountModel(isCreating, search.edit);
  const editState = model.isLoadingEdit ? 'loading' : model.isEditError ? 'error' : 'ready';

  return (
    <ConnectAccountSession
      key={`${search.edit ?? 'new'}:${model.editAccount?.id ?? editState}`}
      isOpen={isCreating || Boolean(search.edit)}
      editId={search.edit}
      editAccount={model.editAccount}
      editState={editState}
      model={model}
      onClose={() => update({ new: undefined, edit: undefined })}
      onDelete={() => update({ edit: undefined, remove: search.edit })}
    />
  );
}
