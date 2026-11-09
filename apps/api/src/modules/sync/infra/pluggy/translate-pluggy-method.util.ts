import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';

// The method one of the texts of the bank names (`operationType`, then `paymentMethod`): "PIX",
// "TRANSFERENCIA_MESMA_INSTITUICAO"... it reads word by word so "TED" is not found inside another.
function recognize(text: unknown): BankDataProvider.Transaction['method'] | null {
  if (typeof text !== 'string') return null;
  const words = normalizeText(text).split(/[^A-Z0-9]+/);

  if (words.includes('PIX')) return 'pix';
  if (words.includes('BOLETO')) return 'boleto';
  if (words.some((word) => word === 'TED' || word === 'DOC' || word.startsWith('TRANSFER'))) {
    return 'transfer';
  }

  return null;
}

export function translatePluggyMethod(input: {
  accountType: 'checking' | 'savings' | 'credit_card';
  direction: 'debit' | 'credit';
  operationType: unknown;
  paymentMethod: unknown;
}): BankDataProvider.Transaction['method'] {
  if (input.accountType === 'credit_card') return 'credit';
  const recognized = recognize(input.operationType) ?? recognize(input.paymentMethod);

  if (recognized) return recognized;

  return input.direction === 'debit' ? 'debit' : 'other';
}
