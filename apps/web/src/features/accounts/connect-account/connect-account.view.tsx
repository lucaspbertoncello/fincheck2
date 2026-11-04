import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { ErrorState, FormModal, Skeleton, type IconName } from '@fincheck/ui';
import { useRef } from 'react';

import { ChoiceCards } from '#/features/accounts/connect-account/components/choice-cards.component.tsx';
import { ManualAccountForm } from '#/features/accounts/connect-account/components/manual-account-form.component.tsx';
import {
  OpenFinanceForm,
  type OpenFinanceProblemContent,
} from '#/features/accounts/connect-account/components/open-finance-form.component.tsx';
import { OpenFinanceSuccess } from '#/features/accounts/connect-account/components/open-finance-success.component.tsx';
import { StackedPanels } from '#/features/accounts/connect-account/components/stacked-panels.component.tsx';
import { CONNECT_MODE_OPTIONS } from '#/features/accounts/connect-account/constants/connect-modes.constant.ts';
import type {
  ConnectMode,
  FormErrors,
  ManualAccountForm as ManualAccountFormValues,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';
import { useFocusFirstInvalid } from '#/features/accounts/form-focus/hooks/use-focus-first-invalid.hook.ts';

export type ConnectAccountViewProps = {
  isOpen: boolean;
  onClose: () => void;
  /** The same modal creates and edits; editing has "Excluir" and no way to connect a bank. */
  isEditing: boolean;
  /** Editing, while the account is still loading, or when it did not load. */
  editState: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  onDelete: () => void;
  mode: ConnectMode;
  onModeChange: (mode: ConnectMode) => void;
  isLoadingSettings: boolean;
  isConfigured: boolean;
  /** The connection code pasted from the Open Finance site. */
  code: string;
  onCodeChange: (value: string) => void;
  /** The bank was connected: the modal says what happens now. */
  isConnected: boolean;
  onConnectAnother: () => void;
  /** Why the connect failed, and whether the way out is Configurações instead of trying again. */
  connectError: { message: string; needsSettings: boolean } | null;
  form: ManualAccountFormValues;
  onFieldChange: <K extends keyof ManualAccountFormValues>(
    key: K,
    value: ManualAccountFormValues[K],
  ) => void;
  errors: FormErrors;
  failedAttempts: number;
  /** Error of the manual create or of the edit (the connect has `connectError`). */
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onOpenSettings: () => void;
  /** The bank of an account that comes from the Open Finance is not edited by hand. */
  isBankLocked: boolean;
  typeOptions: readonly { value: Account.Type; label: string; icon: IconName }[];
  institutionOptions: readonly { value: Institution.Code; label: string }[];
  brandOptions: readonly { value: CreditCard.Brand; label: string }[];
};

type Texts = { title: string; description: string; submit: string; submitting: string };

/** Every create text is one short line, so the header never changes height. */
function resolveTexts(
  isEditing: boolean,
  isConnected: boolean,
  mode: ConnectMode,
  type: Account.Type,
): Texts {
  if (isEditing) {
    return type === 'credit_card'
      ? {
          title: 'Editar cartão',
          description: 'O apelido, os dias da fatura e o que mais mudou.',
          submit: 'Salvar',
          submitting: 'Salvando...',
        }
      : {
          title: 'Editar conta',
          description: 'O nome e o banco da conta.',
          submit: 'Salvar',
          submitting: 'Salvando...',
        };
  }
  if (isConnected) {
    return {
      title: 'Banco conectado',
      description: 'As contas e os cartões já estão a caminho.',
      submit: 'Concluir',
      submitting: 'Concluindo...',
    };
  }
  if (mode === 'open-finance') {
    return {
      title: 'Conectar banco',
      description: 'Traz contas e cartões do seu banco.',
      submit: 'Conectar banco',
      submitting: 'Conectando...',
    };
  }
  return {
    title: 'Nova conta manual',
    description: 'Carteira ou banco sem Open Finance.',
    submit: type === 'credit_card' ? 'Criar cartão' : 'Criar conta',
    submitting: 'Criando...',
  };
}

/** Same height for every create variant on a wide screen, capped so a short screen scrolls instead. */
const CREATE_REGION_CLASS = 'lg:min-h-[min(39.5rem,calc(100dvh-16rem))]';

/**
 * "Conectar banco" / "Nova conta manual" / "Editar conta": a bank through the Open Finance (its
 * contas e cartões come together), or an account typed by hand (RF-ACC-001, RF-ACC-002). The first
 * choice says the result; Open Finance, manual and the success share one cell, so switching does
 * not resize the modal.
 */
export function ConnectAccountView({
  isOpen,
  onClose,
  isEditing,
  editState,
  onRetry,
  onDelete,
  mode,
  onModeChange,
  isLoadingSettings,
  isConfigured,
  code,
  onCodeChange,
  isConnected,
  onConnectAnother,
  connectError,
  form,
  onFieldChange,
  errors,
  failedAttempts,
  submitError,
  isSubmitting,
  onSubmit,
  onOpenSettings,
  isBankLocked,
  typeOptions,
  institutionOptions,
  brandOptions,
}: ConnectAccountViewProps) {
  const content = useRef<HTMLDivElement>(null);
  useFocusFirstInvalid(content, failedAttempts);
  const texts = resolveTexts(isEditing, isConnected, mode, form.type);
  const isOpenFinance = !isEditing && mode === 'open-finance';
  const waitingKeys = isOpenFinance && !isConnected && (!isConfigured || isLoadingSettings);

  const problem: OpenFinanceProblemContent | null = !isConfigured
    ? {
        variant: 'warning',
        title: 'Falta configurar o Open Finance',
        description: 'Salve o Client ID e o Secret em Configurações para conectar um banco.',
        actionLabel: 'Abrir Configurações',
        onAction: onOpenSettings,
      }
    : connectError
      ? {
          variant: 'error',
          title: connectError.message,
          actionLabel: connectError.needsSettings ? 'Abrir Configurações' : 'Tentar de novo',
          onAction: connectError.needsSettings ? onOpenSettings : onSubmit,
        }
      : null;

  const manualForm = (
    <ManualAccountForm
      form={form}
      errors={errors}
      onFieldChange={onFieldChange}
      typeOptions={typeOptions}
      institutionOptions={institutionOptions}
      brandOptions={brandOptions}
      isEditing={isEditing}
      isBankLocked={isBankLocked}
    />
  );

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={texts.title}
      description={texts.description}
      submitLabel={texts.submit}
      submittingLabel={texts.submitting}
      cancelLabel={isConnected ? 'Fechar' : 'Cancelar'}
      onSubmit={isConnected ? onClose : onSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={editState !== 'ready' || waitingKeys}
      submitHint={
        waitingKeys && !isLoadingSettings
          ? 'Salve as chaves do Open Finance em Configurações para conectar um banco.'
          : undefined
      }
      error={isOpenFinance ? undefined : (submitError ?? undefined)}
      destructive={isEditing ? { label: 'Excluir', onPress: onDelete } : undefined}
      initialFocus="input[type=text]"
    >
      <div ref={content} className="flex flex-col gap-s16 lg:gap-s24">
        {editState === 'loading' ? <Skeleton className="h-ctl-touch w-full" /> : null}
        {editState === 'error' ? (
          <ErrorState title="Não deu para carregar a conta" onRetry={onRetry} headingLevel={3} />
        ) : null}
        {editState === 'ready' && isEditing ? manualForm : null}
        {editState === 'ready' && !isEditing ? (
          <div className={`flex flex-col gap-s16 lg:gap-s24 ${CREATE_REGION_CLASS}`}>
            {isConnected ? null : (
              <ChoiceCards
                label="Como adicionar"
                options={CONNECT_MODE_OPTIONS}
                value={mode}
                onChange={onModeChange}
                columns={2}
                isDisabled={isSubmitting}
              />
            )}
            <StackedPanels
              active={isConnected ? 'success' : mode}
              panels={{
                'open-finance': (
                  <OpenFinanceForm
                    isLoading={isLoadingSettings}
                    isActive={mode === 'open-finance'}
                    code={code}
                    onCodeChange={onCodeChange}
                    error={errors['itemId']}
                    isConnecting={isSubmitting}
                    problem={isLoadingSettings ? null : problem}
                    onUseManual={() => onModeChange('manual')}
                  />
                ),
                manual: manualForm,
                success: isConnected ? (
                  <OpenFinanceSuccess onConnectAnother={onConnectAnother} />
                ) : null,
              }}
            />
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
