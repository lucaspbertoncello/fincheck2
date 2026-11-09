import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  dismissPaymentSuggestionQuerySchema,
  dismissPaymentSuggestionRequestSchema,
} from '@fincheck/shared/common/payment-suggestion/payment-suggestion.schema.ts';
import { monthSchema } from '@fincheck/shared/common/date/date.schema.ts';
import {
  invoiceDetailDtoSchema,
  invoiceDtoSchema,
  listInvoicesQuerySchema,
  openInvoiceItemSchema,
  updateInvoiceRequestSchema,
} from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
import { createInvoicePaymentRequestSchema } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.schema.ts';
import { http } from 'msw';

import { buildInvoiceDetailExtras } from '#mocks/invoices/invoice/build-invoice-detail-extras.util.ts';
import { assertTransactionCanPay } from '#mocks/invoices/invoice/assert-transaction-can-pay.util.ts';
import { computeInvoice } from '#mocks/invoices/invoice/compute-invoice.util.ts';
import { ensureInvoiceRow } from '#mocks/invoices/invoice/ensure-invoice-row.util.ts';
import { listOpenInvoices } from '#mocks/invoices/invoice/list-open-invoices.util.ts';
import { openMonthFor } from '#mocks/invoices/invoice/open-month-for.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import { assertSupportedMonth } from '#mocks/support/dates/assert-supported-month.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { isTransactionLinked } from '#mocks/transactions/transaction/is-transaction-linked.util.ts';
import { findTransaction } from '#mocks/transactions/transaction/find-transaction.util.ts';

function readMonth(params: Record<string, string>): string {
  const parsed = monthSchema.safeParse(params['month']);
  if (!parsed.success) fail(400, 'VALIDATION_FAILED', 'Mês fora do formato YYYY-MM');
  assertSupportedMonth(parsed.data, 'month');

  return parsed.data;
}

function monthIndex(month: string): number {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7));
}

function accountOf(params: Record<string, string>): string {
  return params['accountId'] ?? '';
}

export const invoiceMock = [
  http.get(
    '/api/invoices/open',
    handleRoute({ response: listResponseSchema(openInvoiceItemSchema) }, () => ({
      items: listOpenInvoices(db).map((invoice) => ({ accountId: invoice.accountId, invoice })),
    })),
  ),

  http.get(
    '/api/cards/:accountId/invoices',
    handleRoute(
      { query: listInvoicesQuerySchema, response: listResponseSchema(invoiceDtoSchema) },
      ({ params, query }) => {
        const account = db.accounts.find(
          (item) => item.id === accountOf(params) && item.type === 'credit_card',
        );
        if (!account?.creditCard) fail(404, 'CARD_NOT_FOUND', 'A conta não existe ou não é cartão');
        const openMonth = openMonthFor(account.creditCard, TODAY);
        const from = query.from ?? addMonths(openMonth, -2);
        const to = query.to ?? addMonths(openMonth, 3);
        // The side that did not come took its default: the range is checked like a whole one.
        assertSupportedMonth(from, 'from');
        assertSupportedMonth(to, 'to');
        const distance = monthIndex(to) - monthIndex(from);
        if (distance < 0) fail(400, 'VALIDATION_FAILED', 'from must not be after to');
        if (distance > 24) fail(400, 'VALIDATION_FAILED', 'At most 24 months apart');
        const items = [];
        for (let month = from; month <= to; month = addMonths(month, 1)) {
          items.push(computeInvoice(db, account.id, month).dto);
        }

        return { items };
      },
    ),
  ),

  http.get(
    '/api/cards/:accountId/invoices/:month',
    handleRoute({ response: invoiceDetailDtoSchema }, ({ params }) => {
      const month = readMonth(params);
      const { dto, items } = computeInvoice(db, accountOf(params), month);

      return { ...dto, items, ...buildInvoiceDetailExtras(db, accountOf(params), month, items) };
    }),
  ),

  http.patch(
    '/api/cards/:accountId/invoices/:month',
    handleRoute(
      { body: updateInvoiceRequestSchema, response: invoiceDtoSchema },
      ({ params, body }) => {
        const month = readMonth(params);
        if (computeInvoice(db, accountOf(params), month).dto.status === 'projected')
          fail(422, 'INVOICE_NOT_EDITABLE', 'Fatura ainda não aberta');
        const row = ensureInvoiceRow(db, accountOf(params), month);
        if (body.totalOverrideCents !== undefined) {
          row.totalOverrideCents = body.totalOverrideCents;
          if (body.totalOverrideCents === null) row.overrideNote = null;
        }
        if (body.overrideNote !== undefined && row.totalOverrideCents !== null)
          row.overrideNote = body.overrideNote;

        return computeInvoice(db, accountOf(params), month).dto;
      },
    ),
  ),

  http.post(
    '/api/cards/:accountId/invoices/:month/payments',
    handleRoute(
      { body: createInvoicePaymentRequestSchema, response: invoiceDtoSchema, status: 201 },
      ({ params, body }) => {
        const month = readMonth(params);
        const { dto } = computeInvoice(db, accountOf(params), month);
        // The order of the errors: card and transaction that do not exist (404), the invoice not
        // payable, the transaction invalid (422), the transaction already linked (409).
        const tx = body.transactionId ? findTransaction(db, body.transactionId) : null;
        if (dto.status === 'projected') fail(422, 'INVOICE_NOT_PAYABLE', 'Fatura ainda não aberta');
        if (tx) {
          assertTransactionCanPay(tx, accountOf(params), body.amountCents);
          if (isTransactionLinked(db, tx.id)) {
            fail(
              409,
              'INVOICE_PAYMENT_TRANSACTION_ALREADY_LINKED',
              'A transação já paga uma fatura ou está ligada a outra coisa',
            );
          }
          // One the detector already marked stays as it is (set by the system).
          if (tx.nature !== 'invoice_payment') {
            tx.nature = 'invoice_payment';
            tx.natureSetBy = 'user';
            tx.categoryId = null;
            tx.categorySource = null;
            tx.categoryRuleId = null;
          }
        }
        ensureInvoiceRow(db, accountOf(params), month).payments.push({
          id: newId(),
          amountCents: body.amountCents,
          paidOn: body.paidOn,
          transactionId: body.transactionId ?? null,
        });

        return computeInvoice(db, accountOf(params), month).dto;
      },
    ),
  ),

  http.delete(
    '/api/cards/:accountId/invoices/:month/payments/:paymentId',
    handleRoute({}, ({ params }) => {
      const month = readMonth(params);
      computeInvoice(db, accountOf(params), month);
      // No row, no payment: nothing is created by a delete.
      const row =
        db.invoices.find((item) => item.accountId === accountOf(params) && item.month === month) ??
        fail(404, 'INVOICE_PAYMENT_NOT_FOUND', 'O pagamento não existe');
      const payment =
        row.payments.find((item) => item.id === params['paymentId']) ??
        fail(404, 'INVOICE_PAYMENT_NOT_FOUND', 'O pagamento não existe');
      row.payments = row.payments.filter((item) => item.id !== payment.id);
      const tx = db.transactions.find((item) => item.id === payment.transactionId);
      // What Lucas tied goes back to what its sign says; what the detector marked stays a payment.
      if (tx && tx.nature === 'invoice_payment' && tx.natureSetBy === 'user') {
        tx.nature =
          tx.amountCents < 0
            ? 'expense'
            : tx.accountId === accountOf(params)
              ? 'expense'
              : 'income';
        tx.natureSetBy = 'system';
      }
    }),
  ),

  http.post(
    '/api/cards/:accountId/invoices/:month/payment-suggestion/dismiss',
    handleRoute(
      { body: dismissPaymentSuggestionRequestSchema, response: invoiceDtoSchema },
      ({ params, body }) => {
        const month = readMonth(params);
        computeInvoice(db, accountOf(params), month);
        findTransaction(db, body.transactionId);
        const row = ensureInvoiceRow(db, accountOf(params), month);
        if (!row.dismissedTransactionIds.includes(body.transactionId))
          row.dismissedTransactionIds.push(body.transactionId);

        return computeInvoice(db, accountOf(params), month).dto;
      },
    ),
  ),

  http.delete(
    '/api/cards/:accountId/invoices/:month/payment-suggestion/dismiss',
    handleRoute(
      { query: dismissPaymentSuggestionQuerySchema, response: invoiceDtoSchema },
      ({ params, query }) => {
        const month = readMonth(params);
        computeInvoice(db, accountOf(params), month);
        findTransaction(db, query.transactionId);
        const row = ensureInvoiceRow(db, accountOf(params), month);
        row.dismissedTransactionIds = row.dismissedTransactionIds.filter(
          (id) => id !== query.transactionId,
        );

        return computeInvoice(db, accountOf(params), month).dto;
      },
    ),
  ),
];
