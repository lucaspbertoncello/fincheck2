import { isApiError } from '#/shared/api/api.error.ts';

const MESSAGES: Record<string, string> = {
  ACCOUNT_BALANCE_UNCHANGED: 'O saldo já é esse. Digite outro valor.',
  ACCOUNT_BALANCE_NOT_ADJUSTABLE: 'O saldo desta conta vem do banco e não se ajusta à mão.',
  ACCOUNT_ARCHIVED: 'A conta está arquivada. Desarquive para ajustar o saldo.',
  ACCOUNT_NOT_FOUND: 'A conta não existe mais.',
};

/** What to tell the person when the balance adjustment failed. */
export function describeAdjustError(error: unknown): string {
  if (isApiError(error))
    return MESSAGES[error.code] ?? 'Não deu para ajustar o saldo. Tente de novo.';
  return 'Não deu para ajustar o saldo. Tente de novo.';
}
