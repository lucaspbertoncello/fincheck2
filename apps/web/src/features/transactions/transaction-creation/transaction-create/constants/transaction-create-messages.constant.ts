import type { TransactionCreateField } from '#/features/transactions/transaction-creation/transaction-create/types/transaction-create-form.type.ts';

export const TRANSACTION_CREATE_MESSAGES: Record<TransactionCreateField, string> = {
  amount: 'O valor precisa ser maior que zero.',
  description: 'Escreva uma descrição.',
  date: 'Escolha uma data válida.',
  account: 'Escolha a conta.',
  method: 'Escolha o meio.',
};

/** Which form field each key of the request body belongs to. */
export const TRANSACTION_CREATE_FIELDS: Record<string, TransactionCreateField> = {
  amountCents: 'amount',
  description: 'description',
  occurredOn: 'date',
  accountId: 'account',
  method: 'method',
};

export const CARD_METHODS = ['credit'] as const;
export const OTHER_METHODS = ['pix', 'debit', 'cash', 'boleto', 'transfer', 'other'] as const;
