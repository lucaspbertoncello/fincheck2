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
import { listMonthOccurrences } from '#mocks/recurrences/occurrence/list-month-occurrences.util.ts';
import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, NOW_ISO, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
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
        const month = listMonthOccurrences(db, query.month).filter(
          (item) => !item.carriedOver && item.status !== 'skipped',
        );
        const incomes = month.filter((item) => item.kind === 'income');
        const expenses = month.filter((item) => item.kind === 'expense');

        return {
          incomes: {
            expectedCents: incomes.reduce((sum, item) => sum + item.expectedAmountCents, 0),
            receivedCents: incomes.reduce((sum, item) => sum + item.receivedCents, 0),
            count: incomes.length,
          },
          expenses: {
            expectedCents: expenses.reduce((sum, item) => sum + item.expectedAmountCents, 0),
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
        const occurrences = [];
        let month =
          body.startsMonth && body.startsMonth > CURRENT_MONTH ? body.startsMonth : CURRENT_MONTH;
        while (occurrences.length < 3) {
          const window = computeOccurrenceWindow(body.dateRule, month);
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
        if (body.accountId) findAccount(db, body.accountId);
        if (body.categoryId) assertCategoryKind(body.categoryId, body.kind);
        const linked = body.linkTransactionId ? findTransaction(db, body.linkTransactionId) : null;
        if (linked) {
          const taken = db.occurrences.some((item) =>
            item.payments.some((payment) => payment.transactionId === linked.id),
          );
          if (taken)
            fail(
              409,
              'OCCURRENCE_TRANSACTION_ALREADY_LINKED',
              'A transação já abate outra ocorrência',
            );
          const rightWay = body.kind === 'income' ? linked.amountCents > 0 : linked.amountCents < 0;
          if (!rightWay)
            fail(422, 'OCCURRENCE_TRANSACTION_KIND_MISMATCH', 'A transação não bate com o tipo');
        }

        assertRegimeForIncome(body.kind, body.employmentRegime);
        const linkedMonth = linked ? linked.occurredOn.slice(0, 7) : null;
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
          dateRule: body.dateRule,
          maxPayments: body.maxPayments ?? 1,
          startsMonth: body.startsMonth ?? linkedMonth ?? CURRENT_MONTH,
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
        if (body.accountId) findAccount(db, body.accountId);
        if (body.categoryId) assertCategoryKind(body.categoryId, record.kind);
        assertRegimeForIncome(record.kind, body.employmentRegime);

        const { applyFrom, ...changes } = body;
        const touched = {
          amount: changes.expectedAmountCents !== undefined,
          rule: changes.dateRule !== undefined,
        };
        Object.assign(record, {
          ...changes,
          matchText:
            changes.matchText === undefined
              ? record.matchText
              : changes.matchText === null
                ? null
                : normalizeText(changes.matchText),
          updatedAt: NOW_ISO,
        });

        for (const occurrence of [...db.occurrences]) {
          if (occurrence.recurrenceId !== record.id) continue;
          if (
            changes.startsMonth &&
            occurrence.month < changes.startsMonth &&
            occurrence.month >= CURRENT_MONTH &&
            isUntouched(occurrence)
          ) {
            db.occurrences = db.occurrences.filter((item) => item.id !== occurrence.id);
            continue;
          }
          const editable =
            occurrence.month > CURRENT_MONTH ||
            (occurrence.month === CURRENT_MONTH && applyFrom === 'current_month');
          if (!editable || !isUntouched(occurrence)) continue;
          if (touched.amount) occurrence.expectedAmountCents = record.expectedAmountCents;
          if (touched.rule)
            Object.assign(occurrence, computeOccurrenceWindow(record.dateRule, occurrence.month));
        }
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
