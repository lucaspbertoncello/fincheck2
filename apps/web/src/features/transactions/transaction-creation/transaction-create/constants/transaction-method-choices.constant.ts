import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

export const TRANSACTION_METHOD_CHOICES: Record<Transaction.Method, string> = {
  credit: 'Crédito',
  debit: 'Débito',
  pix: 'Pix',
  cash: 'Dinheiro',
  boleto: 'Boleto',
  transfer: 'Transferência',
  other: 'Outro',
};
