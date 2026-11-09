import {
  createBillRequestSchema,
  billCounterpartyDtoSchema,
  billDtoSchema,
  billPaymentCandidateDtoSchema,
  listBillPaymentCandidatesQuerySchema,
  listBillsQuerySchema,
  updateBillRequestSchema,
} from '@fincheck/shared/bills/bill/bill.schema.ts';
import { createBillPaymentRequestSchema } from '@fincheck/shared/bills/bill-payment/bill-payment.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  dismissPaymentSuggestionQuerySchema,
  dismissPaymentSuggestionRequestSchema,
} from '@fincheck/shared/common/payment-suggestion/payment-suggestion.schema.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { http } from 'msw';

import { applyBillPaymentEffect } from '#mocks/bills/bill/apply-bill-payment-effect.util.ts';
import { listPaymentCandidates } from '#mocks/bills/bill/list-payment-candidates.util.ts';
import { presentBill } from '#mocks/bills/bill/present-bill.util.ts';
import { undoBillPaymentEffect } from '#mocks/bills/bill/undo-bill-payment-effect.util.ts';
import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';
import { findTransaction } from '#mocks/transactions/transaction/find-transaction.util.ts';
import { isTransactionLinked } from '#mocks/transactions/transaction/is-transaction-linked.util.ts';

const idOf = (params: Record<string, string>) => params['id'] ?? '';

function findBill(id: string): MockState.BillRecord {
  return (
    db.bills.find((item) => item.id === id) ?? fail(404, 'BILL_NOT_FOUND', 'A conta não existe')
  );
}

function assertCategoryWay(
  categoryId: string,
  direction: 'payable' | 'receivable',
  friendReceivable: boolean,
) {
  const category = findCategory(db, categoryId);
  const wanted = direction === 'payable' ? 'expense' : 'income';
  if (category.kind !== wanted || friendReceivable)
    fail(422, 'BILL_CATEGORY_KIND_MISMATCH', 'Categoria de tipo errado');
}

// The order of the errors of a payment tied to a transaction: already linked (409), then the
// transaction that does not serve (422), then the bill settled and the value over what is missing.
function assertPaymentTransaction(
  tx: MockState.TransactionRecord,
  direction: 'payable' | 'receivable',
  amountCents: number,
) {
  if (isTransactionLinked(db, tx.id))
    fail(409, 'BILL_TRANSACTION_ALREADY_LINKED', 'A transação já está ligada');
  const rightWay =
    direction === 'payable'
      ? tx.amountCents < 0 && tx.nature === 'expense'
      : tx.amountCents > 0 && tx.nature === 'income';
  if (
    !rightWay ||
    tx.splits.length > 0 ||
    !countsInAccounts(tx) ||
    amountCents > Math.abs(tx.amountCents)
  ) {
    fail(422, 'BILL_PAYMENT_TRANSACTION_INVALID', 'A transação não serve como pagamento');
  }
}

// Money that comes back from a friend and is bigger than the debt splits: without an amount, the
// payment is worth what is still missing. Any other bill keeps the whole transaction.
function defaultPaymentCents(bill: MockState.BillRecord, tx: MockState.TransactionRecord): number {
  const worth = Math.abs(tx.amountCents);
  const missing = presentBill(db, bill).remainingCents;
  const reimbursement = bill.kind === 'friend' && bill.direction === 'receivable';

  return reimbursement && missing > 0 ? Math.min(worth, missing) : worth;
}

function assertCanReceive(bill: MockState.BillRecord, amountCents: number) {
  const view = presentBill(db, bill);
  if (view.status === 'settled') fail(422, 'BILL_ALREADY_SETTLED', 'A conta já está quitada');
  if (amountCents > view.remainingCents) fail(422, 'BILL_OVERPAID', 'O valor passa do que falta');
}

// Writes what `assertCanReceive` and `assertPaymentTransaction` already accepted.
function addPayment(
  bill: MockState.BillRecord,
  tx: MockState.TransactionRecord,
  amountCents: number,
  paidOn: string,
) {
  bill.payments.push({
    id: newId(),
    amountCents,
    paidOn,
    transactionId: tx.id,
    description: null,
  });
  applyBillPaymentEffect(bill, tx, amountCents);
}

export const billMock = [
  http.get(
    '/api/bills/counterparties',
    handleRoute({ response: listResponseSchema(billCounterpartyDtoSchema) }, () => {
      const groups = new Map<string, { name: string; latest: string; open: number }>();
      for (const bill of [...db.bills].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        if (bill.kind !== 'friend' || !bill.counterparty) continue;
        const key = normalizeText(bill.counterparty);
        const group = groups.get(key) ?? {
          name: bill.counterparty,
          latest: bill.createdAt,
          open: 0,
        };
        group.name = bill.counterparty;
        group.latest = bill.createdAt;
        if (presentBill(db, bill).status !== 'settled') group.open += 1;
        groups.set(key, group);
      }

      return {
        items: [...groups.values()]
          .sort((a, b) => b.latest.localeCompare(a.latest))
          .map((group) => ({ name: group.name, openBillsCount: group.open })),
      };
    }),
  ),

  http.get(
    '/api/bills/payment-candidates',
    handleRoute(
      {
        query: listBillPaymentCandidatesQuerySchema,
        response: listResponseSchema(billPaymentCandidateDtoSchema),
      },
      ({ query }) => ({
        items: listPaymentCandidates(db, query.direction, query.counterparty ?? null),
      }),
    ),
  ),

  http.get(
    '/api/bills',
    handleRoute(
      { query: listBillsQuerySchema, response: listResponseSchema(billDtoSchema) },
      ({ query }) => {
        const status = query.status ?? 'open';
        const items = db.bills
          .filter(
            (bill) =>
              (!query.direction || bill.direction === query.direction) &&
              (!query.kind || bill.kind === query.kind),
          )
          .map((bill) => presentBill(db, bill))
          .filter(
            (bill) => status === 'all' || (status === 'settled') === (bill.status === 'settled'),
          )
          .sort((a, b) => {
            if (a.dueOn !== b.dueOn) {
              if (a.dueOn === null) return 1;
              if (b.dueOn === null) return -1;
              return a.dueOn.localeCompare(b.dueOn);
            }

            return a.createdAt.localeCompare(b.createdAt);
          });

        return { items };
      },
    ),
  ),

  http.get(
    '/api/bills/:id',
    handleRoute({ response: billDtoSchema }, ({ params }) =>
      presentBill(db, findBill(idOf(params))),
    ),
  ),

  http.post(
    '/api/bills',
    handleRoute(
      { body: createBillRequestSchema, response: billDtoSchema, status: 201 },
      ({ body }) => {
        const friendReceivable = body.kind === 'friend' && body.direction === 'receivable';
        // The order of the API: what does not exist (404), what is tied (409), the rules (422).
        const category = body.categoryId ? findCategory(db, body.categoryId) : null;
        const originTx = body.origin ? findTransaction(db, body.origin.transactionId) : null;
        const paymentTx = body.payment ? findTransaction(db, body.payment.transactionId) : null;
        if (body.origin && !friendReceivable)
          fail(422, 'BILL_ORIGIN_NOT_ALLOWED', 'Origem só em "me devem" de amigo');
        if (category) assertCategoryWay(category.id, body.direction, friendReceivable);

        const record: MockState.BillRecord = {
          id: newId(),
          direction: body.direction,
          kind: body.kind,
          description: body.description,
          counterparty: body.counterparty ?? null,
          amountCents: body.amountCents,
          dueOn: body.dueOn ?? null,
          categoryId: body.categoryId ?? null,
          origin: null,
          payments: [],
          dismissedTransactionIds: [],
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        };

        let originShare = 0;
        if (body.origin && originTx) {
          if (originTx.id === paymentTx?.id || isTransactionLinked(db, originTx.id))
            fail(409, 'BILL_TRANSACTION_ALREADY_LINKED', 'A transação já está ligada');
          if (
            originTx.amountCents >= 0 ||
            originTx.nature !== 'expense' ||
            originTx.splits.length > 0 ||
            !countsInAccounts(originTx)
          ) {
            fail(422, 'BILL_ORIGIN_TRANSACTION_INVALID', 'A origem tem de ser uma saída comum');
          }
          originShare = body.origin.amountCents ?? Math.abs(originTx.amountCents);
          if (originShare > Math.abs(originTx.amountCents) || originShare > body.amountCents) {
            fail(422, 'BILL_ORIGIN_AMOUNT_EXCEEDS', 'A parte do amigo passa do valor');
          }
        }
        // Everything that can fail is checked before anything is written.
        let paymentCents = 0;
        if (paymentTx) {
          paymentCents = defaultPaymentCents(record, paymentTx);
          assertPaymentTransaction(paymentTx, record.direction, paymentCents);
          assertCanReceive(record, paymentCents);
        }

        if (body.origin && originTx) {
          record.origin = {
            transactionId: originTx.id,
            amountCents: originShare,
            occurredOn: originTx.occurredOn,
            description: originTx.description,
          };
          originTx.natureSetBy = 'user';
          if (originShare === Math.abs(originTx.amountCents)) {
            originTx.nature = 'lent';
            originTx.categoryId = null;
            originTx.categorySource = null;
            originTx.categoryRuleId = null;
          } else {
            const own = Math.abs(originTx.amountCents) - originShare;
            originTx.splits = [
              {
                id: newId(),
                position: 1,
                amountCents: -own,
                nature: 'expense',
                categoryId: originTx.categoryId,
                description: 'Minha parte',
              },
              {
                id: newId(),
                position: 2,
                amountCents: -originShare,
                nature: 'lent',
                categoryId: null,
                description: record.counterparty,
              },
            ];
            originTx.categoryId = null;
            originTx.categorySource = null;
            originTx.categoryRuleId = null;
          }
        }
        db.bills.push(record);
        if (paymentTx) addPayment(record, paymentTx, paymentCents, paymentTx.occurredOn);

        return presentBill(db, record);
      },
    ),
  ),

  http.patch(
    '/api/bills/:id',
    handleRoute({ body: updateBillRequestSchema, response: billDtoSchema }, ({ params, body }) => {
      const bill = findBill(idOf(params));
      if (body.amountCents !== undefined && body.amountCents < presentBill(db, bill).paidCents) {
        fail(422, 'BILL_AMOUNT_BELOW_PAID', 'O valor não pode ficar abaixo do que já foi pago');
      }
      if (body.categoryId)
        assertCategoryWay(
          body.categoryId,
          bill.direction,
          bill.kind === 'friend' && bill.direction === 'receivable',
        );
      if (body.description !== undefined) bill.description = body.description;
      if (body.counterparty !== undefined) bill.counterparty = body.counterparty;
      if (body.amountCents !== undefined) bill.amountCents = body.amountCents;
      if (body.dueOn !== undefined) bill.dueOn = body.dueOn;
      if (body.categoryId !== undefined) bill.categoryId = body.categoryId;
      bill.updatedAt = NOW_ISO;

      return presentBill(db, bill);
    }),
  ),

  http.delete(
    '/api/bills/:id',
    handleRoute({}, ({ params }) => {
      const bill = findBill(idOf(params));
      for (const payment of bill.payments) {
        const tx = db.transactions.find((item) => item.id === payment.transactionId);
        if (tx) undoBillPaymentEffect(tx);
      }
      const origin = db.transactions.find((item) => item.id === bill.origin?.transactionId);
      if (origin) {
        if (origin.nature === 'lent') {
          origin.nature = 'expense';
          origin.natureSetBy = 'system';
        }
        const own = origin.splits.find((part) => part.nature === 'expense');
        if (own) {
          origin.categoryId = own.categoryId;
          origin.categorySource = own.categoryId ? 'user' : null;
        }
        if (origin.splits.some((part) => part.nature === 'lent')) origin.splits = [];
      }
      db.bills = db.bills.filter((item) => item.id !== bill.id);
    }),
  ),

  http.get(
    '/api/bills/:id/payment-candidates',
    handleRoute({ response: listResponseSchema(billPaymentCandidateDtoSchema) }, ({ params }) => {
      const bill = findBill(idOf(params));

      return {
        items: listPaymentCandidates(
          db,
          bill.direction,
          bill.counterparty,
          bill.dismissedTransactionIds,
        ),
      };
    }),
  ),

  http.post(
    '/api/bills/:id/payment-suggestion/dismiss',
    handleRoute(
      { body: dismissPaymentSuggestionRequestSchema, response: billDtoSchema },
      ({ params, body }) => {
        const bill = findBill(idOf(params));
        findTransaction(db, body.transactionId);
        if (!bill.dismissedTransactionIds.includes(body.transactionId))
          bill.dismissedTransactionIds.push(body.transactionId);

        return presentBill(db, bill);
      },
    ),
  ),

  http.delete(
    '/api/bills/:id/payment-suggestion/dismiss',
    handleRoute(
      { query: dismissPaymentSuggestionQuerySchema, response: billDtoSchema },
      ({ params, query }) => {
        const bill = findBill(idOf(params));
        findTransaction(db, query.transactionId);
        bill.dismissedTransactionIds = bill.dismissedTransactionIds.filter(
          (id) => id !== query.transactionId,
        );

        return presentBill(db, bill);
      },
    ),
  ),

  http.post(
    '/api/bills/:id/payments',
    handleRoute(
      { body: createBillPaymentRequestSchema, response: billDtoSchema, status: 201 },
      ({ params, body }) => {
        const bill = findBill(idOf(params));

        if (body.transactionId) {
          const tx = findTransaction(db, body.transactionId);
          const amount = body.amountCents ?? defaultPaymentCents(bill, tx);
          assertPaymentTransaction(tx, bill.direction, amount);
          assertCanReceive(bill, amount);
          addPayment(bill, tx, amount, body.paidOn ?? tx.occurredOn);
        } else {
          const amount = body.amountCents ?? 0;
          assertCanReceive(bill, amount);
          bill.payments.push({
            id: newId(),
            amountCents: amount,
            paidOn: body.paidOn ?? NOW_ISO.slice(0, 10),
            transactionId: null,
            description: null,
          });
        }
        bill.updatedAt = NOW_ISO;

        return presentBill(db, bill);
      },
    ),
  ),

  http.delete(
    '/api/bills/:id/payments/:paymentId',
    handleRoute({}, ({ params }) => {
      const bill = findBill(idOf(params));
      const payment =
        bill.payments.find((item) => item.id === params['paymentId']) ??
        fail(404, 'BILL_PAYMENT_NOT_FOUND', 'O pagamento não existe');
      const tx = db.transactions.find((item) => item.id === payment.transactionId);
      if (tx) undoBillPaymentEffect(tx);
      bill.payments = bill.payments.filter((item) => item.id !== payment.id);
    }),
  ),
];
