import type { TransactionEditErrors, TransactionEditValues } from '@fincheck/ui';

const BUSINESS_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(date: string): boolean {
  const match = BUSINESS_DATE.exec(date);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Checks the edit form; the result goes to the panel as `errors`. Empty object means valid. */
export function validateTransactionEdit(values: TransactionEditValues): TransactionEditErrors {
  const errors: TransactionEditErrors = {};

  if (values.description.trim() === '') errors.description = 'Escreva uma descrição.';
  if (!Number.isInteger(values.amountCents) || values.amountCents <= 0) {
    errors.amount = 'O valor precisa ser maior que zero.';
  }
  if (!isRealDate(values.date)) errors.date = 'Escolha uma data válida.';
  if (values.nature === 'transfer' && !values.counterpartId) {
    errors.counterpart = 'Escolha a outra perna da transferência.';
  }
  return errors;
}
