import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { ErrorState, FormModal, Skeleton, type IconName } from '@fincheck/ui';
import { useRef } from 'react';

import { ChoiceCards } from '#/features/accounts/connect-account/components/choice-cards.component.tsx';
import { ManualAccountForm } from '#/features/accounts/connect-account/components/manual-account-form.component.tsx';
import { PluggyItemForm } from '#/features/accounts/connect-account/components/pluggy-item-form.component.tsx';
import type {
  ConnectMode,
  FormErrors,
  ManualAccountForm as ManualAccountFormValues,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';
import { useFocusFirstInvalid } from '#/features/accounts/form-focus/hooks/use-focus-first-invalid.hook.ts';

const MODE_OPTIONS = [
  {
    value: 'pluggy' as const,
    label: 'Pelo Meu Pluggy',
    icon: 'plug' as const,
    description: 'Cole o ID do item e o banco vem sozinho',
  },
  {
    value: 'manual' as const,
    label: 'Conta manual',
    icon: 'edit' as const,
    description: 'Você lança e ajusta o saldo',
  },
];

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
  itemId: string;
  onItemIdChange: (value: string) => void;
  form: ManualAccountFormValues;
  onFieldChange: <K extends keyof ManualAccountFormValues>(
    key: K,
    value: ManualAccountFormValues[K],
  ) => void;
  errors: FormErrors;
  failedAttempts: number;
  submitError: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onOpenSettings: () => void;
  /** The bank of an account that comes from the Pluggy is not edited by hand. */
  isBankLocked: boolean;
  typeOptions: readonly { value: Account.Type; label: string; icon: IconName }[];
  institutionOptions: readonly { value: Institution.Code; label: string }[];
  brandOptions: readonly { value: CreditCard.Brand; label: string }[];
};

function resolveTexts(isEditing: boolean, mode: ConnectMode, type: Account.Type) {
  if (isEditing) {
    return type === 'credit_card'
      ? {
          title: 'Editar cartão',
          description: 'O apelido, os dias da fatura e o que mais mudou.',
          submit: 'Salvar',
        }
      : { title: 'Editar conta', description: 'O nome e o banco da conta.', submit: 'Salvar' };
  }
  const submit =
    mode === 'pluggy' ? 'Conectar banco' : type === 'credit_card' ? 'Criar cartão' : 'Criar conta';
  return {
    title: 'Conectar conta',
    description: 'Um banco pelo Meu Pluggy ou uma conta lançada à mão.',
    submit,
  };
}

/** "Conectar conta" / "Editar conta": a bank through the Meu Pluggy, or an account typed by hand (RF-ACC-001, RF-ACC-002). */
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
  itemId,
  onItemIdChange,
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
  const texts = resolveTexts(isEditing, mode, form.type);
  const waitingPluggy = mode === 'pluggy' && (!isConfigured || isLoadingSettings);

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={texts.title}
      description={texts.description}
      submitLabel={texts.submit}
      submittingLabel={isEditing ? 'Salvando...' : 'Conectando...'}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={editState !== 'ready' || waitingPluggy}
      submitHint={
        waitingPluggy && !isLoadingSettings
          ? 'Salve as chaves do Pluggy em Configurações para conectar um banco.'
          : undefined
      }
      error={submitError ?? undefined}
      destructive={isEditing ? { label: 'Excluir', onPress: onDelete } : undefined}
      initialFocus="input[type=text]"
    >
      <div ref={content} className="flex flex-col gap-s16 lg:gap-s24">
        {editState === 'loading' ? <Skeleton className="h-ctl-touch w-full" /> : null}
        {editState === 'error' ? (
          <ErrorState title="Não deu para carregar a conta" onRetry={onRetry} headingLevel={3} />
        ) : null}
        {editState === 'ready' ? (
          <>
            {isEditing ? null : (
              <ChoiceCards
                label="Como conectar"
                options={MODE_OPTIONS}
                value={mode}
                onChange={onModeChange}
                columns={2}
              />
            )}
            {mode === 'pluggy' ? (
              <PluggyItemForm
                isLoading={isLoadingSettings}
                isConfigured={isConfigured}
                itemId={itemId}
                onItemIdChange={onItemIdChange}
                error={errors['itemId']}
                onOpenSettings={onOpenSettings}
              />
            ) : (
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
            )}
          </>
        ) : null}
      </div>
    </FormModal>
  );
}
