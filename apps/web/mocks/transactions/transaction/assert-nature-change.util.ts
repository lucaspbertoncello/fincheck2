import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { buildTransactionLinks } from '#mocks/transactions/transaction/build-transaction-links.util.ts';
import { fail } from '#mocks/support/http/fail.util.ts';

// The checks of the API when Lucas picks the nature of a transaction (`Transaction.changeNature`):
// a split one does not change, the flows that own a nature keep it, a transaction that settles an
// occurrence or pays a bill keeps its nature while the link stands, and the sign has to fit (the
// nature it already has is never a new mismatch).
export function assertNatureChange(
  database: MockState.Database,
  tx: MockState.TransactionRecord,
  nature: 'expense' | 'income' | 'transfer',
): void {
  if (tx.splits.length > 0) fail(422, 'TRANSACTION_IS_SPLIT', 'Desfaça a divisão antes');
  const links = buildTransactionLinks(database, tx);
  if (
    ['lent', 'reimbursed', 'balance_adjustment'].includes(tx.nature) ||
    (tx.nature === 'invoice_payment' && links.invoicePayment !== null)
  ) {
    fail(422, 'TRANSACTION_NATURE_LOCKED', 'A natureza só muda pelo fluxo dono');
  }
  if (links.occurrence && nature !== tx.nature) {
    fail(
      422,
      'TRANSACTION_LINKED_TO_OCCURRENCE',
      'A transação está ligada a uma recorrência: desligue antes de mudar a natureza.',
    );
  }
  if (links.bill?.role === 'payment' && nature !== tx.nature) {
    fail(
      422,
      'TRANSACTION_LINKED_TO_BILL',
      'A transação está ligada a uma conta: desfaça o vínculo antes de mudar a natureza ou o valor.',
    );
  }
  const isCard = Boolean(findAccount(database, tx.accountId).creditCard);
  // Credit on a card is a refund, an expense with a positive value: never income by hand (the
  // category of income is the way, `applyCardCreditNature`).
  if (nature === 'income' && nature !== tx.nature && isCard) {
    fail(400, 'VALIDATION_FAILED', 'Entrada fora do contrato', {
      issues: [{ path: 'nature', message: 'Crédito no cartão nunca é receita.' }],
    });
  }
  // On a card a positive expense is a refund, so `expense` always fits the sign there.
  if (
    nature !== tx.nature &&
    ((nature === 'expense' && tx.amountCents > 0 && !isCard) ||
      (nature === 'income' && tx.amountCents < 0))
  ) {
    fail(422, 'TRANSACTION_NATURE_SIGN_MISMATCH', 'Natureza e sinal do valor não combinam');
  }
}
