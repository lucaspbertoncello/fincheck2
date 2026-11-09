import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  createRecurrenceRequestSchema,
  createRecurrenceResponseSchema,
  listRecurrencesQuerySchema,
  previewRecurrenceRequestSchema,
  previewRecurrenceResponseSchema,
  recurrenceDetailDtoSchema,
  recurrenceDtoSchema,
  recurrenceListItemSchema,
  recurrenceSummarySchema,
  summaryRecurrencesQuerySchema,
  updateRecurrenceRequestSchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import { http } from 'msw';

import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { computeOccurrenceWindow } from '#mocks/recurrences/occurrence/compute-occurrence-window.util.ts';
import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { normalizeDateRule } from '#mocks/recurrences/recurrence/normalize-date-rule.util.ts';
import { listMonthOccurrences } from '#mocks/recurrences/occurrence/list-month-occurrences.util.ts';
import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { assertSupportedMonth } from '#mocks/support/dates/assert-supported-month.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';
import { isTransactionLinked } from '#mocks/transactions/transaction/is-transaction-linked.util.ts';
import { findTransaction } from '#mocks/transactions/transaction/find-transaction.util.ts';

const idOf = (params: Record<string, string>) => params['id'] ?? '';

function findRecurrence(id: string): MockState.RecurrenceRecord {
  return (
    db.recurrences.find((item) => item.id === id) ??
    fail(404, 'RECURRENCE_NOT_FOUND', 'A recorrência não existe')
  );
}

function toDto(record: MockState.RecurrenceRecord): Recurrence.Dto {
  return record;
}

function isUntouched(occurrence: MockState.OccurrenceRecord): boolean {
  return occurrence.payments.length === 0 && !occurrence.settledAt && !occurrence.skippedAt;
}

function monthOccurrence(recurrenceId: string, month: string) {
  const record = db.occurrences.find(
    (item) => item.recurrenceId === recurrenceId && item.month === month,
  );

  return record ? presentOccurrence(db, record) : null;
}

function isSameDateRule(a: Recurrence.DateRule, b: Recurrence.DateRule): boolean {
  return (
    a.type === b.type &&
    a.day === b.day &&
    a.businessDayNumber === b.businessDayNumber &&
    a.toleranceDays === b.toleranceDays &&
    a.nonBusinessDayShift === b.nonBusinessDayShift
  );
}

function assertRegimeForIncome(kind: string, regime: string | null | undefined) {
  if (regime && kind !== 'income')
    fail(422, 'RECURRENCE_REGIME_ONLY_FOR_INCOME', 'O regime s� vale para receita');
}

function assertCategoryKind(categoryId: string, kind: string) {
  if (findCategory(db, categoryId).kind !== kind)
    fail(422, 'RECURRENCE_CATEGORY_KIND_MISMATCH', 'Categoria de outro tipo');
}

export const recurrenceMock = [
  http.get(
    '/api/recurrences/summary',
    handleRoute(
      { query: summaryRecurrencesQuerySchema, response: recurrenceSummarySchema },
      ({ query }) => {
        assertSupportedMonth(query.month, 'month');
        // The set of the list of recurrences: the live ones only, with the skipped out.
        const month = listMonthOccurrences(db, query.month).filter(
          (item) =>
            !item.carriedOver &&
            item.status !== 'skipped' &&
            !db.recurrences.find((recurrence) => recurrence.id === item.recurrenceId)?.archivedAt,
        );
        const incomes = month.filter((item) => item.kind === 'income');
        const expenses = month.filter((item) => item.kind === 'expense');

        return {
          incomes: {
            expectedCents: incomes.reduce((sum, item) => sum + item.expectedAmountCents, 0),
            receivedCents: incomes.reduce((sum, item) => sum + item.receivedCents, 0),
            missingCents: incomes.reduce((sum, item) => sum + item.remainingCents, 0),
            count: incomes.length,
          },
          expenses: {
            expectedCents: expenses.reduce((sum, item) => sum + item.expectedAmountCents, 0),
            paidCents: expenses.reduce((sum, item) => sum + item.receivedCents, 0),
            missingCents: expenses.reduce((sum, item) => sum + item.remainingCents, 0),
            paidCount: expenses.filter((item) => item.status === 'confirmed').length,
            lateCount: expenses.filter((item) => item.status === 'late').length,
            differentCount: expenses.filter(
              (item) => item.difference !== null && item.difference.decision === null,
            ).length,
            count: expenses.length,
          },
        };
      },
    ),
  ),

  http.post(
    '/api/recurrences/preview',
    handleRoute(
      { body: previewRecurrenceRequestSchema, response: previewRecurrenceResponseSchema },
      ({ body }) => {
        if (body.startsMonth) assertSupportedMonth(body.startsMonth, 'startsMonth');
        const occurrences = [];
        let month =
          body.startsMonth && body.startsMonth > CURRENT_MONTH ? body.startsMonth : CURRENT_MONTH;
        while (occurrences.length < 3) {
          const window = computeOccurrenceWindow(normalizeDateRule(body.dateRule), month);
          if (window.windowEndOn >= TODAY) occurrences.push({ month, ...window });
          month = addMonths(month, 1);
        }

        return { occurrences };
      },
    ),
  ),

  http.get(
    '/api/recurrences',
    handleRoute(
      { query: listRecurrencesQuerySchema, response: listResponseSchema(recurrenceListItemSchema) },
      ({ query }) => {
        assertSupportedMonth(query.month, 'month');
        ensureOccurrences(db);
        const items = db.recurrences
          .filter((item) => query.includeArchived || !item.archivedAt)
          .map((item) => ({ ...toDto(item), occurrence: monthOccurrence(item.id, query.month) }))
          .sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === 'income' ? -1 : 1;
            const dateA = a.occurrence?.expectedOn ?? null;
            const dateB = b.occurrence?.expectedOn ?? null;
            if (dateA !== dateB) {
              if (dateA === null) return 1;
              if (dateB === null) return -1;
              return dateA.localeCompare(dateB);
            }

            return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
          });

        return { items };
      },
    ),
  ),

  http.get(
    '/api/recurrences/:id',
    handleRoute({ response: recurrenceDetailDtoSchema }, ({ params }) => {
      const record = findRecurrence(idOf(params));
      ensureOccurrences(db);
      const history = db.occurrences
        .filter((item) => item.recurrenceId === record.id && item.month <= CURRENT_MONTH)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 6)
        .map((item) => presentOccurrence(db, item));

      return { ...toDto(record), history };
    }),
  ),

  http.post(
    '/api/recurrences',
    handleRoute(
      {
        body: createRecurrenceRequestSchema,
        response: createRecurrenceResponseSchema,
        status: 201,
      },
      ({ body }) => {
        // The order of the errors: the month out of range (400), the account, the category and the
        // transaction that do not exist (404), the archived account, the regime and the category of
        // the wrong kind and the transaction of the wrong kind (422), the transaction linked (409).
        if (body.startsMonth) assertSupportedMonth(body.startsMonth, 'startsMonth');
        const account = body.accountId ? findAccount(db, body.accountId) : null;
        const category = body.categoryId ? findCategory(db, body.categoryId) : null;
        const linked = body.linkTransactionId ? findTransaction(db, body.linkTransactionId) : null;
        if (account?.archivedAt) fail(422, 'ACCOUNT_ARCHIVED', 'A conta está arquivada');
        assertRegimeForIncome(body.kind, body.employmentRegime);
        if (category) assertCategoryKind(category.id, body.kind);
        if (linked) {
          const rightWay =
            body.kind === 'income'
              ? linked.amountCents > 0 && linked.nature === 'income'
              : linked.amountCents < 0 && linked.nature === 'expense';
          if (!rightWay || !countsInAccounts(linked))
            fail(422, 'OCCURRENCE_TRANSACTION_KIND_MISMATCH', 'A transação não bate com o tipo');
          if (isTransactionLinked(db, linked.id))
            fail(
              409,
              'OCCURRENCE_TRANSACTION_ALREADY_LINKED',
              'A transação já abate outra ocorrência',
            );
        }

        const linkedMonth = linked ? linked.occurredOn.slice(0, 7) : null;
        const dateRule = normalizeDateRule(body.dateRule);
        // No first month asked and no transaction: this month, unless its window already closed
        // (the day has passed), then the next one. A month or a transaction given is taken as is.
        const defaultStart =
          computeOccurrenceWindow(dateRule, CURRENT_MONTH).windowEndOn < TODAY
            ? addMonths(CURRENT_MONTH, 1)
            : CURRENT_MONTH;
        const record: MockState.RecurrenceRecord = {
          id: newId(),
          kind: body.kind,
          name: body.name,
          expectedAmountCents: body.expectedAmountCents,
          amountMode: body.amountMode ?? 'fixed',
          counterparty: body.counterparty ?? null,
          matchText: body.matchText ? normalizeText(body.matchText) : null,
          employmentRegime: body.kind === 'income' ? (body.employmentRegime ?? null) : null,
          accountId: body.accountId ?? null,
          method: body.method ?? null,
          categoryId: body.categoryId ?? null,
          // The schema already refuses the flag on an income and a service without the flag.
          isSubscription: body.isSubscription,
          serviceSlug: body.isSubscription ? (body.serviceSlug ?? null) : null,
          dateRule,
          // Left out is one payment; `null` is "Quantas vierem".
          maxPayments: body.maxPayments === undefined ? 1 : body.maxPayments,
          startsMonth: body.startsMonth ?? linkedMonth ?? defaultStart,
          pausedAt: null,
          archivedAt: null,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        };
        db.recurrences.push(record);
        ensureOccurrences(db);

        if (
          linkedMonth &&
          linkedMonth < CURRENT_MONTH &&
          !db.occurrences.some(
            (item) => item.recurrenceId === record.id && item.month === linkedMonth,
          )
        ) {
          db.occurrences.push({
            id: newId(),
            recurrenceId: record.id,
            month: linkedMonth,
            ...computeOccurrenceWindow(record.dateRule, linkedMonth),
            expectedAmountCents: record.expectedAmountCents,
            settledAt: null,
            skippedAt: null,
            decision: null,
            payments: [],
          });
        }
        let occurrence = monthOccurrence(record.id, CURRENT_MONTH);
        if (linked && linkedMonth) {
          const target = db.occurrences.find(
            (item) => item.recurrenceId === record.id && item.month === linkedMonth,
          );
          if (target) {
            target.payments.push({
              id: newId(),
              transactionId: linked.id,
              amountCents: Math.abs(linked.amountCents),
              occurredOn: linked.occurredOn,
              linkedBy: 'user',
            });
            if (linked.categoryId === null && record.categoryId) {
              linked.categoryId = record.categoryId;
              linked.categorySource = 'recurrence';
            }
            occurrence = presentOccurrence(db, target);
          }
        }

        return { recurrence: toDto(record), occurrence };
      },
    ),
  ),

  http.patch(
    '/api/recurrences/:id',
    handleRoute(
      { body: updateRecurrenceRequestSchema, response: recurrenceDtoSchema },
      ({ params, body }) => {
        const record = findRecurrence(idOf(params));
        if (record.archivedAt) fail(422, 'RECURRENCE_ARCHIVED', 'A recorrência está arquivada');
        if (body.startsMonth) assertSupportedMonth(body.startsMonth, 'startsMonth');
        if (body.accountId) {
          const account = findAccount(db, body.accountId);
          // Moving it to an archived account is refused; one that already lives there stays.
          if (account.archivedAt && body.accountId !== record.accountId) {
            fail(422, 'ACCOUNT_ARCHIVED', 'A conta está arquivada');
          }
        }
        if (body.categoryId) findCategory(db, body.categoryId);
        assertRegimeForIncome(record.kind, body.employmentRegime);
        const isSubscription = body.isSubscription ?? record.isSubscription;
        if (isSubscription && record.kind !== 'expense')
          fail(400, 'VALIDATION_FAILED', 'Só uma despesa pode ser assinatura', {
            issues: [{ path: 'isSubscription', message: 'Only an expense can be a subscription' }],
          });
        if (!isSubscription && body.serviceSlug)
          fail(400, 'VALIDATION_FAILED', 'O serviço só vale para assinatura', {
            issues: [{ path: 'serviceSlug', message: 'A service only goes with a subscription' }],
          });
        if (body.categoryId) assertCategoryKind(body.categoryId, record.kind);

        const { applyFrom, ...changes } = body;
        // The occurrences copy only the field that moved in this edit, not the one that came.
        const touched = {
          amount:
            changes.expectedAmountCents !== undefined &&
            changes.expectedAmountCents !== record.expectedAmountCents,
          rule:
            changes.dateRule !== undefined &&
            !isSameDateRule(normalizeDateRule(changes.dateRule), record.dateRule),
        };
        const startsLater =
          changes.startsMonth !== undefined && record.startsMonth < changes.startsMonth;
        Object.assign(record, {
          ...changes,
          ...(changes.dateRule ? { dateRule: normalizeDateRule(changes.dateRule) } : {}),
          isSubscription,
          // Turning the flag off clears the service; otherwise a service sent wins.
          serviceSlug: !isSubscription
            ? null
            : changes.serviceSlug === undefined
              ? record.serviceSlug
              : changes.serviceSlug,
          matchText:
            changes.matchText === undefined
              ? record.matchText
              : changes.matchText === null
                ? null
                : normalizeText(changes.matchText),
          updatedAt: NOW_ISO,
        });

        // From the current month on, an untouched occurrence: the ones before a first month moved
        // later are dropped; the others are redone with the field that moved (the current month
        // only on "também neste mês"). Past months and months with a payment or a mark stay.
        for (const occurrence of [...db.occurrences]) {
          if (occurrence.recurrenceId !== record.id) continue;
          if (occurrence.month < CURRENT_MONTH || !isUntouched(occurrence)) continue;
          if (startsLater && occurrence.month < record.startsMonth) {
            db.occurrences = db.occurrences.filter((item) => item.id !== occurrence.id);
            continue;
          }
          const editable =
            occurrence.month > CURRENT_MONTH ||
            (occurrence.month === CURRENT_MONTH && applyFrom === 'current_month');
          if (!editable) continue;
          if (touched.amount) occurrence.expectedAmountCents = record.expectedAmountCents;
          if (touched.rule)
            Object.assign(occurrence, computeOccurrenceWindow(record.dateRule, occurrence.month));
        }
        // A first month moved earlier: the occurrences that are missing are created.
        ensureOccurrences(db);

        return toDto(record);
      },
    ),
  ),

  http.post(
    '/api/recurrences/:id/pause',
    handleRoute({ response: recurrenceDtoSchema }, ({ params }) => {
      const record = findRecurrence(idOf(params));
      if (record.archivedAt) fail(422, 'RECURRENCE_ARCHIVED', 'A recorrência está arquivada');
      if (record.pausedAt) fail(409, 'RECURRENCE_ALREADY_PAUSED', 'Já está pausada');
      record.pausedAt = NOW_ISO;
      db.occurrences = db.occurrences.filter(
        (item) =>
          item.recurrenceId !== record.id || item.month <= CURRENT_MONTH || !isUntouched(item),
      );

      return toDto(record);
    }),
  ),

  http.post(
    '/api/recurrences/:id/resume',
    handleRoute({ response: recurrenceDtoSchema }, ({ params }) => {
      const record = findRecurrence(idOf(params));
      if (record.archivedAt) fail(422, 'RECURRENCE_ARCHIVED', 'A recorrência está arquivada');
      if (!record.pausedAt) fail(409, 'RECURRENCE_NOT_PAUSED', 'Não está pausada');
      record.pausedAt = null;
      ensureOccurrences(db);

      return toDto(record);
    }),
  ),

  http.delete(
    '/api/recurrences/:id',
    handleRoute({}, ({ params }) => {
      const record = findRecurrence(idOf(params));
      if (record.archivedAt) return;
      record.archivedAt = NOW_ISO;
      db.occurrences = db.occurrences.filter(
        (item) =>
          item.recurrenceId !== record.id || item.month < CURRENT_MONTH || !isUntouched(item),
      );
    }),
  ),
];
