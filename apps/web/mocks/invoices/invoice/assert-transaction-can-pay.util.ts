import type { MockState } from '#mocks/state/mock-state.type.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

function invalid(reason: string): never {
  return fail(
    422,
    'INVOICE_PAYMENT_TRANSACTION_INVALID',
    `A transação não serve como pagamento desta fatura: ${reason}`,
  );
}

// Whether a transaction may pay an invoice of the card: it counts (not ignored, not removed by the
// bank without an edit); it is not split and has no other role (a transfer, a debt, an
// adjustment); it is an outgoing of an own account that is not this card, or a credit of this very
// card; and the amount paid does not pass its value.
export function assertTransactionCanPay(
  tx: MockState.TransactionRecord,
  cardAccountId: string,
  amountCents: number,
): void {
  if (!countsInAccounts(tx)) invalid('ela está ignorada ou foi removida pelo banco.');
  if (tx.splits.length > 0) invalid('ela está dividida.');
  if (!['expense', 'income', 'invoice_payment'].includes(tx.nature)) {
    invalid('ela já tem outro papel (transferência, dívida ou ajuste).');
  }
  const isOutgoingOfOtherAccount = tx.amountCents < 0 && tx.accountId !== cardAccountId;
  const isCreditOfTheCard = tx.amountCents > 0 && tx.accountId === cardAccountId;
  if (!isOutgoingOfOtherAccount && !isCreditOfTheCard) {
    invalid('precisa ser uma saída de uma conta sua ou um crédito deste cartão.');
  }
  if (amountCents > Math.abs(tx.amountCents)) invalid('o valor passa do valor da transação.');
}
