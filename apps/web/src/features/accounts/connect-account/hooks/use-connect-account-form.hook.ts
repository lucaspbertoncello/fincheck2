import { useState } from 'react';

import type {
  ConnectMode,
  FormErrors,
  ManualAccountForm,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';

const EMPTY_FORM: ManualAccountForm = {
  type: 'checking',
  name: '',
  institutionCode: '',
  institutionName: '',
  initialBalanceCents: 0,
  brand: 'visa',
  last4: '',
  closingDay: '',
  dueDay: '',
  limitCents: 0,
};

/** The state of the "Conectar conta" modal: mode, item id, manual form and field errors. */
export function useConnectAccountForm() {
  const [mode, setMode] = useState<ConnectMode>('pluggy');
  const [itemId, setItemId] = useState('');
  const [form, setForm] = useState<ManualAccountForm>(EMPTY_FORM);
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
    setMode('pluggy');
    setItemId('');
    setForm(EMPTY_FORM);
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
