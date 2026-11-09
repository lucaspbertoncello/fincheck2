import { allocateCents } from '@fincheck/shared/common/money/allocate-cents.util.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  createInstallmentPlanRequestSchema,
  installmentPlanDtoSchema,
  listInstallmentPlansQuerySchema,
} from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import { http } from 'msw';

import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { assertUsableCategory } from '#mocks/transactions/transaction/assert-usable-category.util.ts';
import { assertUsableTags } from '#mocks/transactions/transaction/assert-usable-tags.util.ts';
import { presentInstallmentPlan } from '#mocks/transactions/installment-plan/present-installment-plan.util.ts';

export const installmentPlanMock = [
  http.get(
    '/api/installment-plans',
    handleRoute(
      {
        query: listInstallmentPlansQuerySchema,
        response: listResponseSchema(installmentPlanDtoSchema),
      },
      ({ query }) => {
        if (query.accountId) findAccount(db, query.accountId);
        const items = db.installmentPlans
          .filter((plan) => !query.accountId || plan.accountId === query.accountId)
          .map((plan) => presentInstallmentPlan(db, plan))
          .filter(
            (plan) =>
              query.active === undefined || (plan.nextInstallment !== null) === query.active,
          )
          .sort((a, b) => {
            if (!a.nextInstallment && !b.nextInstallment)
              return b.purchaseOn.localeCompare(a.purchaseOn);
            if (!a.nextInstallment) return 1;
            if (!b.nextInstallment) return -1;

            return a.nextInstallment.invoiceMonth.localeCompare(b.nextInstallment.invoiceMonth);
          });

        return { items };
      },
    ),
  ),

  http.post(
    '/api/installment-plans',
    handleRoute(
      { body: createInstallmentPlanRequestSchema, response: installmentPlanDtoSchema, status: 201 },
      ({ body }) => {
        const account = findAccount(db, body.accountId);
        if (account.type !== 'credit_card')
          fail(422, 'INSTALLMENT_ACCOUNT_NOT_CARD', 'A conta não é cartão de crédito');
        if (account.archivedAt) fail(422, 'TRANSACTION_ACCOUNT_ARCHIVED', 'Cartão arquivado');
        if (body.categoryId) assertUsableCategory(db, body.categoryId, 'expense');
        assertUsableTags(db, body.tagIds ?? [], body.categoryId ? [body.categoryId] : []);

        const plan: MockState.InstallmentPlanRecord = {
          id: newId(),
          accountId: account.id,
          origin: 'manual',
          description: body.description,
          purchaseOn: body.purchaseOn,
          totalCents: body.totalCents,
          installmentCount: body.installmentCount,
          firstInvoiceMonth: body.firstInvoiceMonth,
          categoryId: body.categoryId ?? null,
        };
        db.installmentPlans.push(plan);
        allocateCents(body.totalCents, body.installmentCount).forEach((amount, index) => {
          const month = addMonths(body.firstInvoiceMonth, index);
          db.transactions.push(
            makeTransactionRecord({
              accountId: account.id,
              origin: 'manual',
              method: 'credit',
              nature: 'expense',
              natureSetBy: 'user',
              description: body.description,
              amountCents: -amount,
              occurredOn: dateInMonth(month, dayOf(body.purchaseOn)),
              invoiceMonth: month,
              categoryId: body.categoryId ?? null,
              tagIds: body.tagIds ?? [],
              installment: { planId: plan.id, number: index + 1, count: body.installmentCount },
            }),
          );
        });

        return presentInstallmentPlan(db, plan);
      },
    ),
  ),

  http.delete(
    '/api/installment-plans/:id',
    handleRoute({}, ({ params }) => {
      const plan =
        db.installmentPlans.find((item) => item.id === params['id']) ??
        fail(404, 'INSTALLMENT_PLAN_NOT_FOUND', 'O plano não existe');
      if (plan.origin === 'bank')
        fail(422, 'INSTALLMENT_PLAN_NOT_MANUAL', 'O plano do banco não se apaga');
      const gone = new Set(
        db.transactions.filter((tx) => tx.installment?.planId === plan.id).map((tx) => tx.id),
      );
      db.transactions = db.transactions.filter((tx) => !gone.has(tx.id));
      db.installmentPlans = db.installmentPlans.filter((item) => item.id !== plan.id);
      for (const invoice of db.invoices)
        invoice.payments = invoice.payments.filter(
          (payment) => !payment.transactionId || !gone.has(payment.transactionId),
        );
    }),
  ),
];
