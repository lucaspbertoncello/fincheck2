import type { Insertable, Selectable } from 'kysely';

import type { BillPaymentDismissalsTable } from '#/database/tables/bills/bill-payment-dismissals-table.type.ts';
import type { BillPaymentsTable } from '#/database/tables/bills/bill-payments-table.type.ts';
import type { BillsTable } from '#/database/tables/bills/bills-table.type.ts';
import { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import { BillPayment } from '#/modules/bills/domain/bill-payment/bill-payment.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The aggregate as rows: the bill, its payments and its dismissals.
export class BillItem {
  static fromEntity(bill: Bill): BillItem.Rows {
    return {
      bill: {
        id: bill.id,
        direction: bill.direction,
        kind: bill.kind,
        description: bill.description,
        counterparty: bill.counterparty,
        amount_cents: bill.amount.cents,
        due_on: bill.dueOn?.value ?? null,
        category_id: bill.categoryId,
        origin_transaction_id: bill.originTransactionId,
        created_at: bill.createdAt,
        updated_at: bill.updatedAt,
      },
      payments: bill.payments.map((payment) => ({
        id: payment.id,
        bill_id: bill.id,
        transaction_id: payment.transactionId,
        amount_cents: payment.amount.cents,
        paid_on: payment.paidOn.value,
        created_at: payment.createdAt,
      })),
      dismissals: bill.dismissedTransactionIds.map((transactionId) => ({
        bill_id: bill.id,
        transaction_id: transactionId,
        created_at: bill.updatedAt,
      })),
    };
  }

  static toDomain(
    row: Selectable<BillsTable>,
    payments: Selectable<BillPaymentsTable>[],
    dismissals: Selectable<BillPaymentDismissalsTable>[],
  ): Bill {
    return new Bill({
      id: row.id,
      direction: row.direction,
      kind: row.kind,
      description: row.description,
      counterparty: row.counterparty,
      amount: Money.fromCents(row.amount_cents),
      dueOn: row.due_on === null ? null : BusinessDate.of(row.due_on),
      categoryId: row.category_id,
      originTransactionId: row.origin_transaction_id,
      payments: payments.map(
        (payment) =>
          new BillPayment({
            id: payment.id,
            transactionId: payment.transaction_id,
            amount: Money.fromCents(payment.amount_cents),
            paidOn: BusinessDate.of(payment.paid_on),
            createdAt: payment.created_at,
          }),
      ),
      dismissedTransactionIds: dismissals.map((dismissal) => dismissal.transaction_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

export namespace BillItem {
  export type Rows = {
    bill: Insertable<BillsTable>;
    payments: Insertable<BillPaymentsTable>[];
    dismissals: Insertable<BillPaymentDismissalsTable>[];
  };
}
