import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

export const TRANSACTION_METHOD_LABELS: Record<Transaction.Method, string> = {
  credit: 'crédito',
  debit: 'débito',
  pix: 'Pix',
  cash: 'dinheiro',
  boleto: 'boleto',
  transfer: 'transferência',
  other: 'outro meio',
};
