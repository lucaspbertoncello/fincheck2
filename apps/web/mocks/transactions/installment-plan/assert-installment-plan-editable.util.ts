import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

type NextShape = {
  /** The new amount of each parcel, in order (the new count is its length). */
  amounts: readonly number[];
  firstInvoiceMonth: string;
  /** The category of the plan changes: every parcel changes with it. */
  categoryChanges: boolean;
};

// What the API refuses before it writes anything (the same codes and `details`): an archived card, a
// parcel that changes while it is split, and an invoice that has a payment registered and would see
// money move. A parcel "changes" when its value or month moves, or when it leaves the plan.
export function assertInstallmentPlanEditable(
  database: MockState.Database,
  plan: MockState.InstallmentPlanRecord,
  parcels: readonly MockState.TransactionRecord[],
  next: NextShape,
): void {
  const card = database.accounts.find((account) => account.id === plan.accountId);
  if (card?.archivedAt) fail(422, 'TRANSACTION_ACCOUNT_ARCHIVED', 'Cartão arquivado');

  const hasPayment = (month: string) =>
    database.invoices.some(
      (invoice) =>
        invoice.accountId === plan.accountId &&
        invoice.month === month &&
        invoice.payments.length > 0,
    );
  const assertUnpaid = (month: string | null) => {
    if (month && hasPayment(month)) {
      fail(
        422,
        'INSTALLMENT_INVOICE_PAID',
        `A fatura de ${month} já tem pagamento registrado: desfaça o pagamento antes de mudar o valor, a quantidade ou o mês das parcelas.`,
        { invoiceMonth: month },
      );
    }
  };

  const byNumber = new Map(parcels.map((tx) => [tx.installment?.number ?? 0, tx]));
  const length = Math.max(next.amounts.length, ...byNumber.keys());
  for (let number = 1; number <= length; number += 1) {
    const tx = byNumber.get(number);
    const amount = next.amounts[number - 1];
    const month = amount === undefined ? null : addMonths(next.firstInvoiceMonth, number - 1);
    const moves =
      tx !== undefined &&
      (amount === undefined || -amount !== tx.amountCents || month !== tx.invoiceMonth);
    const changes = tx === undefined || moves || next.categoryChanges;
    if (!changes) continue;
    if (tx && tx.splits.length > 0 && (moves || next.categoryChanges)) {
      fail(
        422,
        'INSTALLMENT_PARCEL_SPLIT',
        `A parcela ${number} está dividida: desfaça a divisão antes de mudar o valor, a quantidade, a categoria ou as tags do plano.`,
        { number },
      );
    }
    if (moves || tx === undefined) {
      assertUnpaid(tx?.invoiceMonth ?? null);
      assertUnpaid(month);
    }
  }
}
