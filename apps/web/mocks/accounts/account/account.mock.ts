import {
  accountDtoSchema,
  createAccountRequestSchema,
  listAccountsQuerySchema,
  updateAccountRequestSchema,
} from '@fincheck/shared/accounts/account/account.schema.ts';
import {
  adjustBalanceRequestSchema,
  adjustBalanceResponseSchema,
} from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.schema.ts';
import {
  balanceHistoryDtoSchema,
  balanceHistoryQuerySchema,
} from '@fincheck/shared/accounts/balance-history/balance-history.schema.ts';
import { deletionImpactDtoSchema } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { http } from 'msw';

import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import { presentAccount } from '#mocks/accounts/account/present-account.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { CURRENT_MONTH, NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { daysInMonth } from '#mocks/support/dates/days-in-month.util.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';

const TYPE_ORDER = ['checking', 'savings', 'wallet', 'credit_card'];

function addAdjustment(
  account: MockState.AccountRecord,
  amountCents: number,
  occurredOn: string,
  note?: string,
) {
  const record = makeTransactionRecord({
    accountId: account.id,
    origin: 'manual',
    method: 'other',
    nature: 'balance_adjustment',
    natureSetBy: 'user',
    description: note ? `Ajuste de saldo: ${note}` : 'Ajuste de saldo',
    amountCents,
    occurredOn,
  });
  db.transactions.push(record);

  return record;
}

export const accountMock = [
  http.get(
    '/api/accounts',
    handleRoute(
      { query: listAccountsQuerySchema, response: listResponseSchema(accountDtoSchema) },
      ({ query }) => ({
        items: db.accounts
          .filter((account) => query.includeArchived || !account.archivedAt)
          .map((account) => presentAccount(db, account))
          .sort(
            (a, b) =>
              TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
              a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
          ),
      }),
    ),
  ),

  http.get(
    '/api/accounts/:id/balance-history',
    handleRoute(
      { query: balanceHistoryQuerySchema, response: balanceHistoryDtoSchema },
      ({ params, query }) => {
        const account = findAccount(db, params['id'] ?? '');
        if (query.month > CURRENT_MONTH) fail(400, 'VALIDATION_FAILED', 'Mês depois do corrente');
        if (
          account.type === 'credit_card' ||
          (account.source === 'pluggy' && account.bankBalanceCents === null)
        ) {
          fail(422, 'ACCOUNT_HISTORY_NOT_AVAILABLE', 'A curva é só de conta com saldo');
        }
        const lastDay = query.month === CURRENT_MONTH ? dayOf(TODAY) : daysInMonth(query.month);
        const own = db.transactions.filter(
          (tx) => tx.accountId === account.id && countsInAccounts(tx),
        );
        const points = Array.from({ length: lastDay }, (_, index) => {
          const date = `${query.month}-${String(index + 1).padStart(2, '0')}`;
          const balanceCents =
            account.source === 'pluggy'
              ? (account.bankBalanceCents ?? 0) -
                own
                  .filter((tx) => tx.occurredOn > date && tx.occurredOn <= TODAY)
                  .reduce((sum, tx) => sum + tx.amountCents, 0)
              : own
                  .filter((tx) => tx.occurredOn <= date)
                  .reduce((sum, tx) => sum + tx.amountCents, 0);

          return { date, balanceCents };
        });

        return { accountId: account.id, month: query.month, points };
      },
    ),
  ),

  http.get(
    '/api/accounts/:id/deletion-impact',
    handleRoute({ response: deletionImpactDtoSchema }, ({ params }) => {
      const account = findAccount(db, params['id'] ?? '');
      const connection = db.connections.find((item) => item.id === account.connectionId);

      return {
        transactionCount: db.transactions.filter((tx) => tx.accountId === account.id).length,
        installmentPlanCount: db.installmentPlans.filter((plan) => plan.accountId === account.id)
          .length,
        // Every month the card has an invoice row or a transaction in.
        invoiceCount: new Set([
          ...db.invoices.filter((invoice) => invoice.accountId === account.id).map((i) => i.month),
          ...db.transactions
            .filter((tx) => tx.accountId === account.id && tx.invoiceMonth !== null)
            .map((tx) => tx.invoiceMonth),
        ]).size,
        ruleCount: db.rules.filter((rule) => rule.accountId === account.id).length,
        isPluggy: account.source === 'pluggy',
        returnsOnNextSync: account.source === 'pluggy' && connection?.status === 'active',
      };
    }),
  ),

  http.get(
    '/api/accounts/:id',
    handleRoute({ response: accountDtoSchema }, ({ params }) =>
      presentAccount(db, findAccount(db, params['id'] ?? '')),
    ),
  ),

  http.post(
    '/api/accounts',
    handleRoute(
      { body: createAccountRequestSchema, response: accountDtoSchema, status: 201 },
      ({ body }) => {
        const record: MockState.AccountRecord = {
          id: newId(),
          type: body.type,
          source: 'manual',
          name: body.name,
          institutionCode: body.type === 'wallet' ? 'wallet' : (body.institutionCode ?? 'other'),
          institutionName: body.institutionCode === 'other' ? (body.institutionName ?? null) : null,
          bankBalanceCents: null,
          balanceAt: null,
          connectionId: null,
          creditCard: body.creditCard
            ? {
                brand: body.creditCard.brand,
                last4: body.creditCard.last4 ?? null,
                closingDay: body.creditCard.closingDay,
                dueDay: body.creditCard.dueDay,
                limitCents: body.creditCard.limitCents ?? null,
                themeId: body.creditCard.themeId ?? null,
              }
            : null,
          archivedAt: null,
          createdAt: NOW_ISO,
        };
        db.accounts.push(record);
        if (body.initialBalanceCents)
          addAdjustment(record, body.initialBalanceCents, TODAY, 'Saldo inicial');

        return presentAccount(db, record);
      },
    ),
  ),

  http.patch(
    '/api/accounts/:id',
    handleRoute(
      { body: updateAccountRequestSchema, response: accountDtoSchema },
      ({ params, body }) => {
        const account = findAccount(db, params['id'] ?? '');
        if (body.institutionCode !== undefined && account.type === 'wallet')
          fail(400, 'VALIDATION_FAILED', 'Carteira não muda de banco');
        if (body.institutionCode === 'wallet')
          fail(400, 'VALIDATION_FAILED', 'Só a carteira usa o banco "wallet"');
        if (body.creditCard && !account.creditCard)
          fail(422, 'ACCOUNT_NOT_A_CARD', 'A conta não é cartão');

        // The name of the bank only exists for `other`: any other bank clears it (accounts.md).
        const institutionCode = body.institutionCode ?? account.institutionCode;
        let institutionName: string | null = null;
        if (institutionCode === 'other') {
          institutionName =
            body.institutionName === undefined ? account.institutionName : body.institutionName;
          if (institutionName === null) fail(400, 'VALIDATION_FAILED', 'Informe o nome do banco');
        } else if (typeof body.institutionName === 'string') {
          fail(400, 'VALIDATION_FAILED', 'Só o banco "other" tem nome');
        }

        if (body.name !== undefined) account.name = body.name;
        account.institutionCode = institutionCode;
        account.institutionName = institutionName;
        if (body.creditCard && account.creditCard) {
          const patch = body.creditCard;
          account.creditCard = {
            brand: patch.brand ?? account.creditCard.brand,
            last4: patch.last4 === undefined ? account.creditCard.last4 : patch.last4,
            closingDay: patch.closingDay ?? account.creditCard.closingDay,
            dueDay: patch.dueDay ?? account.creditCard.dueDay,
            limitCents:
              patch.limitCents === undefined ? account.creditCard.limitCents : patch.limitCents,
            themeId: patch.themeId === undefined ? account.creditCard.themeId : patch.themeId,
          };
        }

        return presentAccount(db, account);
      },
    ),
  ),

  http.post(
    '/api/accounts/:id/balance-adjustments',
    handleRoute(
      { body: adjustBalanceRequestSchema, response: adjustBalanceResponseSchema, status: 201 },
      ({ params, body }) => {
        const account = findAccount(db, params['id'] ?? '');
        if (account.source === 'pluggy' || account.type === 'credit_card')
          fail(422, 'ACCOUNT_BALANCE_NOT_ADJUSTABLE', 'Só conta manual e carteira');
        if (account.archivedAt) fail(422, 'ACCOUNT_ARCHIVED', 'A conta está arquivada');
        const occurredOn = body.occurredOn ?? TODAY;
        if (occurredOn > TODAY) fail(400, 'VALIDATION_FAILED', 'Data futura');
        const current = presentAccount(db, account).balanceCents ?? 0;
        const difference = body.targetBalanceCents - current;
        if (difference === 0) fail(422, 'ACCOUNT_BALANCE_UNCHANGED', 'O saldo já é esse');
        const record = addAdjustment(account, difference, occurredOn, body.note);

        return {
          account: presentAccount(db, account),
          adjustment: { transactionId: record.id, amountCents: difference },
        };
      },
    ),
  ),

  http.post(
    '/api/accounts/:id/archive',
    handleRoute({ response: accountDtoSchema }, ({ params }) => {
      const account = findAccount(db, params['id'] ?? '');
      if (account.archivedAt) fail(409, 'ACCOUNT_ALREADY_ARCHIVED', 'Já está arquivada');
      account.archivedAt = NOW_ISO;

      return presentAccount(db, account);
    }),
  ),

  http.post(
    '/api/accounts/:id/unarchive',
    handleRoute({ response: accountDtoSchema }, ({ params }) => {
      const account = findAccount(db, params['id'] ?? '');
      if (!account.archivedAt) fail(409, 'ACCOUNT_NOT_ARCHIVED', 'A conta não está arquivada');
      account.archivedAt = null;

      return presentAccount(db, account);
    }),
  ),

  http.delete(
    '/api/accounts/:id',
    handleRoute({}, ({ params }) => {
      const account = findAccount(db, params['id'] ?? '');
      const gone = new Set(
        db.transactions.filter((tx) => tx.accountId === account.id).map((tx) => tx.id),
      );
      // The other leg of a transfer goes back to expense or income by its sign.
      for (const tx of db.transactions) {
        if (tx.transferCounterpartId && gone.has(tx.transferCounterpartId)) {
          tx.transferCounterpartId = null;
          tx.nature = tx.amountCents < 0 ? 'expense' : 'income';
        }
      }
      db.transactions = db.transactions.filter((tx) => !gone.has(tx.id));
      db.installmentPlans = db.installmentPlans.filter((plan) => plan.accountId !== account.id);
      db.invoices = db.invoices.filter((invoice) => invoice.accountId !== account.id);
      db.rules = db.rules.filter((rule) => rule.accountId !== account.id);
      for (const recurrence of db.recurrences)
        if (recurrence.accountId === account.id) recurrence.accountId = null;
      for (const connection of db.connections)
        connection.accountIds = connection.accountIds.filter((id) => id !== account.id);
      db.accounts = db.accounts.filter((item) => item.id !== account.id);
    }),
  ),
];
