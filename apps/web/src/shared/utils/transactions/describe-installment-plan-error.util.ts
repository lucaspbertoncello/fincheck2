import { isApiError, type ApiError } from '#/shared/api/api.error.ts';
import { formatMonthLong } from '#/shared/utils/format-month-long.util.ts';
import {
  describeTransactionError,
  hasTransactionErrorText,
} from '#/shared/utils/transactions/describe-transaction-error.util.ts';

/** "A parcela 3" / "Uma parcela": the API sends `details.number` with the parcel that stopped the change. */
function parcelOf(error: ApiError): string {
  const number = error.details?.['number'];
  return typeof number === 'number' ? `A parcela ${number}` : 'Uma parcela';
}

function invoiceOf(error: ApiError): string {
  const month = error.details?.['invoiceMonth'];
  return typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)
    ? `A fatura de ${formatMonthLong(month)}`
    : 'Uma das faturas';
}

// The one place that turns the `code` of an installment plan error into our own words: short and
// with the way out. The text of the API is the last resort for a code that is not here.
const BY_CODE: Record<string, (error: ApiError) => string> = {
  INSTALLMENT_PLAN_NOT_FOUND: () => 'Essa compra parcelada não existe mais.',
  INSTALLMENT_PLAN_NOT_MANUAL: () =>
    'Compra parcelada do banco não se edita nem se exclui: o app a refaz a cada sincronização.',
  INSTALLMENT_INVOICE_PAID: (error) =>
    `${invoiceOf(error)} já tem pagamento registrado. Desfaça o pagamento para mudar o valor, a quantidade ou o mês das parcelas.`,
  INSTALLMENT_PARCEL_SPLIT: (error) =>
    `${parcelOf(error)} está dividida. Desfaça a divisão para mudar o valor, a quantidade, a categoria ou as tags.`,
  INSTALLMENT_PARCEL_LINKED: (error) =>
    `${parcelOf(error)} está ligada a uma conta ou a uma recorrência. Desfaça o vínculo para mudar o valor ou a quantidade.`,
  INSTALLMENT_PARCEL_FROM_BANK: (error) =>
    `${parcelOf(error)} veio do banco e não muda de valor nem de fatura, e não sai do plano.`,
  TRANSACTION_ACCOUNT_ARCHIVED: () =>
    'O cartão está arquivado. Desarquive o cartão para mexer nas compras parceladas.',
};

/**
 * What to tell the person about a failed installment plan call (create, edit, delete): our words for
 * the codes of the plan; the transaction words for the codes they already know (category, tags,
 * network); the `message` of any other business error (422, 409) as the API wrote it; and the
 * generic text for the rest.
 */
export function describeInstallmentPlanError(error: unknown): string {
  if (isApiError(error)) {
    const known = BY_CODE[error.code];
    if (known) return known(error);
    if (hasTransactionErrorText(error)) return describeTransactionError(error).message;
    if ((error.status === 422 || error.status === 409) && error.message) return error.message;
  }

  return describeTransactionError(error).message;
}
