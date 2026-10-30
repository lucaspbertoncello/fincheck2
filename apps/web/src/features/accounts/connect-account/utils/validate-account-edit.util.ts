import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type {
  FormErrors,
  ManualAccountForm,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';
import { validateManualAccount } from '#/features/accounts/connect-account/utils/validate-manual-account.util.ts';

export type AccountEditValidation =
  { ok: true; body: Account.UpdateRequest } | { ok: false; errors: FormErrors };

function toDay(text: string): number {
  return Number(text);
}

/**
 * Validates the edit with the same rules as the creation, then builds the `PATCH /accounts/:id`
 * body: the kind of account never changes, and a bank that comes from the Pluggy is left alone.
 */
export function validateAccountEdit(
  form: ManualAccountForm,
  isBankLocked: boolean,
): AccountEditValidation {
  const result = validateManualAccount(form);
  if (!result.ok) {
    const errors = { ...result.errors };
    if (isBankLocked) {
      delete errors['institutionCode'];
      delete errors['institutionName'];
    }
    if (Object.keys(errors).length > 0) return { ok: false, errors };
  }

  const isWallet = form.type === 'wallet';
  const isOtherBank = form.institutionCode === 'other';

  return {
    ok: true,
    body: {
      name: form.name.trim(),
      ...(isWallet || isBankLocked
        ? {}
        : {
            institutionCode: form.institutionCode || undefined,
            institutionName: isOtherBank ? form.institutionName.trim() : null,
          }),
      ...(form.type === 'credit_card'
        ? {
            creditCard: {
              brand: form.brand,
              last4: form.last4.trim() === '' ? null : form.last4.trim(),
              closingDay: toDay(form.closingDay),
              dueDay: toDay(form.dueDay),
              limitCents: form.limitCents > 0 ? form.limitCents : null,
            },
          }
        : {}),
    },
  };
}
