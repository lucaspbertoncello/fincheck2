import type { TransactionEditField } from '@fincheck/ui';

import { isApiError } from '#/shared/api/api.error.ts';

type ErrorDescription = { field?: TransactionEditField; message: string };

const BY_CODE: Record<string, ErrorDescription> = {
  TRANSACTION_CATEGORY_KIND_MISMATCH: {
    field: 'category',
    message: 'Essa categoria não é do mesmo tipo da transação.',
  },
  TRANSACTION_CATEGORY_ARCHIVED: { field: 'category', message: 'Essa categoria está arquivada.' },
  TRANSACTION_CATEGORY_NOT_ALLOWED: {
    field: 'category',
    message: 'Transação fora da conta não tem categoria.',
  },
  TRANSACTION_NATURE_SIGN_MISMATCH: {
    field: 'amount',
    message: 'O tipo não combina com o sentido da transação (saiu ou entrou).',
  },
  TRANSACTION_NATURE_LOCKED: {
    message: 'O tipo dessa transação só muda desfazendo o vínculo que ela tem (fatura ou dívida).',
  },
  TRANSACTION_IS_SPLIT: {
    message: 'Transação dividida não muda valor, tipo nem categoria. Desfaça a divisão antes.',
  },
  TRANSACTION_SPLIT_SUM_MISMATCH: { message: 'A soma das partes precisa bater com o total.' },
  TRANSACTION_SPLIT_LINKED_TO_BILL: {
    message: 'Essa divisão está ligada a uma dívida e não pode mudar.',
  },
  TRANSACTION_NOT_MANUAL: { message: 'Só transação lançada à mão pode ser excluída.' },
  TRANSACTION_IS_INSTALLMENT: { message: 'Parcela se exclui junto com a compra parcelada.' },
  TRANSACTION_ACCOUNT_ARCHIVED: { message: 'A conta está arquivada.' },
  TRANSACTION_TAG_CATEGORY_MISMATCH: { message: 'Uma das tags não é da categoria da transação.' },
  TRANSACTION_TAG_NEEDS_CATEGORY: {
    message: 'Escolha a categoria da transação antes de usar tags.',
  },
  TRANSACTION_TAG_ARCHIVED: { message: 'Uma das tags está arquivada.' },
};

/** What to tell the person about a failed transaction call, and which field it belongs to. */
export function describeTransactionError(error: unknown): ErrorDescription {
  if (isApiError(error)) {
    const known = BY_CODE[error.code];
    if (known) return known;
    if (error.code === 'NETWORK_ERROR') {
      return { message: 'Sem resposta da API. Confira a conexão e tente de novo.' };
    }
  }
  return { message: 'Não deu certo. Tente de novo.' };
}
