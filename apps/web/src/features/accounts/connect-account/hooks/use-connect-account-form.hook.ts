import { useState } from 'react';

import { EMPTY_ACCOUNT_FORM } from '#/features/accounts/connect-account/constants/new-account-form.constant.ts';
import type {
  ConnectMode,
  FormErrors,
  ManualAccountForm,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';

/**
 * The state of the "Conectar conta" modal: mode, item id, manual form and field errors. Editing
 * starts from the form of the account (and in the manual mode, the only one it has); a new card
 * also comes with its own form, in the manual mode.
 */
export function useConnectAccountForm(initialForm?: ManualAccountForm) {
  const start = initialForm ?? EMPTY_ACCOUNT_FORM;
  const [mode, setMode] = useState<ConnectMode>(initialForm ? 'manual' : 'open-finance');
  const [itemId, setItemId] = useState('');
  const [form, setForm] = useState<ManualAccountForm>(start);
  const [errors, setErrors] = useState<FormErrors>({});
  const [failedAttempts, setFailedAttempts] = useState(0);

  function setField<K extends keyof ManualAccountForm>(key: K, value: ManualAccountForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function showErrors(next: FormErrors) {
    setErrors(next);
    setFailedAttempts((count) => count + 1);
  }

  function reset() {
    setMode(initialForm ? 'manual' : 'open-finance');
    setItemId('');
    setForm(start);
    setErrors({});
  }

  return {
    mode,
    setMode,
    itemId,
    setItemId,
    form,
    setField,
    errors,
    clearErrors: () => setErrors({}),
    showErrors,
    failedAttempts,
    reset,
  };
}
