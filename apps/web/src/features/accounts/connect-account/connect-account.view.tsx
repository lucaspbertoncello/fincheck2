import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { CreditCard } from '@fincheck/shared/accounts/credit-card/credit-card.type.ts';
import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import { Banner, Button, Modal, SegmentedControl } from '@fincheck/ui';
import { useRef } from 'react';

import { ManualAccountForm } from '#/features/accounts/connect-account/components/manual-account-form.component.tsx';
import { PluggyItemForm } from '#/features/accounts/connect-account/components/pluggy-item-form.component.tsx';
import type {
  ConnectMode,
  FormErrors,
  ManualAccountForm as ManualAccountFormValues,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';
import { useFocusFirstInvalid } from '#/features/accounts/form-focus/hooks/use-focus-first-invalid.hook.ts';

const MODE_OPTIONS = [
  { key: 'pluggy', label: 'Banco (Meu Pluggy)' },
  { key: 'manual', label: 'Conta manual' },
];

const FORM_ID = 'connect-account-form';

export type ConnectAccountViewProps = {
  isOpen: boolean;
  onClose: () => void;
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
  typeOptions: readonly { value: Account.Type; label: string }[];
  institutionOptions: readonly { value: Institution.Code; label: string }[];
  brandOptions: readonly { value: CreditCard.Brand; label: string }[];
};

/** "Conectar conta": a bank through the Meu Pluggy, or an account typed by hand (RF-ACC-001, RF-ACC-002). */
export function ConnectAccountView({
  isOpen,
  onClose,
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
  typeOptions,
  institutionOptions,
  brandOptions,
}: ConnectAccountViewProps) {
  const content = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid(content, failedAttempts);
  const canSubmit = mode === 'manual' || (isConfigured && !isLoadingSettings);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable={!isSubmitting}
      title="Conectar conta"
      subtitle="Um banco pelo Meu Pluggy ou uma conta lançada à mão."
      actions={
        <>
          <Button variant="secondary" isDisabled={isSubmitting} onPress={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={isSubmitting} isDisabled={!canSubmit}>
            {mode === 'pluggy' ? 'Conectar banco' : 'Criar conta'}
          </Button>
        </>
      }
    >
      <SegmentedControl
        label="Como conectar"
        options={MODE_OPTIONS}
        value={mode}
        onChange={(key) => onModeChange(key === 'manual' ? 'manual' : 'pluggy')}
      />
      <form
        id={FORM_ID}
        ref={content}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-s16"
      >
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
          />
        )}
        {submitError ? <Banner variant="error" title={submitError} /> : null}
      </form>
    </Modal>
  );
}
