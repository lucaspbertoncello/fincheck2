import { isApiError } from '#/shared/api/api.error.ts';

// What each error code of the bills routes says to Lucas; the screen decides by `code`, never by the API text.
const MESSAGES: Readonly<Record<string, string>> = {
  BILL_NOT_FOUND: 'Essa conta não existe mais. Atualize a tela.',
  BILL_ALREADY_SETTLED: 'Essa conta já está quitada.',
  BILL_OVERPAID: 'O valor passa do que falta pagar.',
  BILL_AMOUNT_BELOW_PAID: 'O valor não pode ficar abaixo do que já foi pago.',
  BILL_TRANSACTION_ALREADY_LINKED: 'Essa transação já está ligada a outra conta.',
  BILL_PAYMENT_TRANSACTION_INVALID: 'Essa transação não serve como pagamento desta conta.',
  BILL_ORIGIN_TRANSACTION_INVALID: 'Essa transação não pode ser a que você pagou.',
  BILL_ORIGIN_AMOUNT_EXCEEDS: 'A parte do amigo passa do valor da transação.',
  BILL_CATEGORY_KIND_MISMATCH: 'Essa categoria não serve para este tipo de conta.',
  CATEGORY_NOT_FOUND: 'Essa categoria não existe mais.',
  TRANSACTION_NOT_FOUND: 'Essa transação não existe mais.',
  NETWORK_ERROR: 'Não deu para falar com a API. Confira se ela está no ar.',
};

/** The sentence shown next to an action that failed. */
export function describeApiError(error: unknown): string {
  if (isApiError(error)) return MESSAGES[error.code] ?? 'Não deu certo. Tente de novo.';
  return 'Não deu certo. Tente de novo.';
}
