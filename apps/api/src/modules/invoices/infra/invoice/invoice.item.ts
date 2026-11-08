import type { Insertable, Selectable } from 'kysely';

import type { InvoicePaymentDismissalsTable } from '#/database/tables/invoices/invoice-payment-dismissals-table.type.ts';
import type { InvoicePaymentsTable } from '#/database/tables/invoices/invoice-payments-table.type.ts';
import type { InvoicesTable } from '#/database/tables/invoices/invoices-table.type.ts';
import { Invoice } from '#/modules/invoices/domain/invoice/invoice.entity.ts';
import { InvoicePayment } from '#/modules/invoices/domain/invoice-payment/invoice-payment.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The aggregate as rows: the invoice, its payments and its dismissals ("not this one").
export class InvoiceItem {
  static fromEntity(invoice: Invoice): InvoiceItem.Rows {
    return {
      invoice: {
        id: invoice.id,
        account_id: invoice.accountId,
        month: invoice.month.value,
        closes_on: invoice.closesOn.value,
        due_on: invoice.dueOn.value,
        bank_total_cents: invoice.bankTotal?.cents ?? null,
        total_override_cents: invoice.totalOverride?.cents ?? null,
        override_note: invoice.overrideNote,
        created_at: invoice.createdAt,
        updated_at: invoice.updatedAt,
      },
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        invoice_id: invoice.id,
        transaction_id: payment.transactionId,
        amount_cents: payment.amount.cents,
        paid_on: payment.paidOn.value,
        created_at: payment.createdAt,
      })),
      dismissals: invoice.dismissedTransactionIds.map((transactionId) => ({
        invoice_id: invoice.id,
        transaction_id: transactionId,
        created_at: invoice.updatedAt,
      })),
    };
  }

  static toDomain(
    row: Selectable<InvoicesTable>,
    payments: Selectable<InvoicePaymentsTable>[],
    dismissals: Selectable<InvoicePaymentDismissalsTable>[],
  ): Invoice {
    return new Invoice({
      id: row.id,
      accountId: row.account_id,
      month: Month.of(row.month),
      closesOn: BusinessDate.of(row.closes_on),
      dueOn: BusinessDate.of(row.due_on),
      bankTotal: row.bank_total_cents === null ? null : Money.fromCents(row.bank_total_cents),
      totalOverride:
        row.total_override_cents === null ? null : Money.fromCents(row.total_override_cents),
      overrideNote: row.override_note,
      payments: payments.map(
        (payment) =>
          new InvoicePayment({
            id: payment.id,
            amount: Money.fromCents(payment.amount_cents),
            paidOn: BusinessDate.of(payment.paid_on),
            transactionId: payment.transaction_id,
            createdAt: payment.created_at,
          }),
      ),
      dismissedTransactionIds: dismissals.map((dismissal) => dismissal.transaction_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

export namespace InvoiceItem {
  export type Rows = {
    invoice: Insertable<InvoicesTable>;
    payments: Insertable<InvoicePaymentsTable>[];
    dismissals: Insertable<InvoicePaymentDismissalsTable>[];
  };
}
