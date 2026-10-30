import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

export const PAYMENT_METHOD_LABELS: Record<Transaction.Dto['method'], string> = {
  credit: 'crédito',
  debit: 'débito',
  pix: 'Pix',
  cash: 'dinheiro',
  boleto: 'boleto',
  transfer: 'transferência',
  other: 'outro',
};
