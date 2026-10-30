import { createAccountRequestSchema } from '@fincheck/shared/accounts/account/account.schema.ts';

import type {
  FormErrors,
  ManualAccountForm,
} from '#/features/accounts/connect-account/types/connect-account.type.ts';
import { buildCreateAccountRequest } from '#/features/accounts/connect-account/utils/build-create-account-request.util.ts';

const MESSAGES: Record<string, string> = {
  name: 'Dê um nome à conta (até 60 letras)',
  institutionCode: 'Escolha o banco',
  institutionName: 'Diga o nome do banco',
  initialBalanceCents: 'Saldo inicial inválido',
  'creditCard.last4': 'Os 4 últimos dígitos do cartão',
  'creditCard.closingDay': 'Dia de fechamento de 1 a 31',
  'creditCard.dueDay': 'Dia de vencimento de 1 a 31',
  'creditCard.limitCents': 'O limite precisa ser maior que zero',
};

export type ManualAccountValidation =
  | { ok: true; body: ReturnType<typeof createAccountRequestSchema.parse> }
  | { ok: false; errors: FormErrors };

/** Validates the form with the same schema the API uses, with the messages in Portuguese. */
export function validateManualAccount(form: ManualAccountForm): ManualAccountValidation {
  const result = createAccountRequestSchema.safeParse(buildCreateAccountRequest(form));
  if (result.success) return { ok: true, body: result.data };

  const errors: FormErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    errors[key] ??= MESSAGES[key] ?? 'Valor inválido';
  }

  // The schema checks the institution only after the plain fields pass, so say it here too.
  if (form.type !== 'wallet') {
    if (!form.institutionCode) errors['institutionCode'] ??= MESSAGES['institutionCode'];
    if (form.institutionCode === 'other' && form.institutionName.trim() === '') {
      errors['institutionName'] ??= MESSAGES['institutionName'];
    }
  }

  return { ok: false, errors };
}
