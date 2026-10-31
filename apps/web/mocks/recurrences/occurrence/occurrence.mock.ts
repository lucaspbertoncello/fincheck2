import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  decideOccurrenceDifferenceRequestSchema,
  linkOccurrencePaymentRequestSchema,
  listOccurrencesQuerySchema,
  occurrenceCandidateDtoSchema,
  occurrenceDtoSchema,
  updateOccurrenceRequestSchema,
} from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { http } from 'msw';

import { findOccurrence } from '#mocks/recurrences/occurrence/find-occurrence.util.ts';
import { listMonthOccurrences } from '#mocks/recurrences/occurrence/list-month-occurrences.util.ts';
import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';
import { findTransaction } from '#mocks/transactions/transaction/find-transaction.util.ts';

const idOf = (params: Record<string, string>) => params['id'] ?? '';

function recurrenceOf(occurrenceId: string) {
  const record = findOccurrence(db, occurrenceId);
  const recurrence = db.recurrences.find((item) => item.id === record.recurrenceId);
  if (!recurrence) throw new Error('Occurrence without recurrence');

  return { record, recurrence };
}

function isLinkedToOccurrence(transactionId: string): boolean {
  return db.occurrences.some((item) =>
    item.payments.some((payment) => payment.transactionId === transactionId),
  );
}

export const occurrenceMock = [
  http.get(
    '/api/occurrences',
    handleRoute(
      { query: listOccurrencesQuerySchema, response: listResponseSchema(occurrenceDtoSchema) },
      ({ query }) => ({
        items: listMonthOccurrences(db, query.month).filter(
          (occurrence) =>
            query.needsAttention === undefined ||
            occurrence.needsAttention === query.needsAttention,
        ),
      }),
    ),
  ),

  http.get(
    '/api/occurrences/:id/candidates',
    handleRoute({ response: listResponseSchema(occurrenceCandidateDtoSchema) }, ({ params }) => {
      const { record, recurrence } = recurrenceOf(idOf(params));
      const dto = presentOccurrence(db, record);
      const target = dto.remainingCents > 0 ? dto.remainingCents : dto.expectedAmountCents;
      const from = addDays(record.windowStartOn, -15);
      const until = addDays(record.windowEndOn, 15);

      const items = db.transactions
        .filter((tx) => {
          const rightWay =
            recurrence.kind === 'income'
              ? tx.amountCents > 0 && tx.nature === 'income'
              : tx.amountCents < 0 && tx.nature === 'expense';

          return (
            rightWay &&
            countsInAccounts(tx) &&
            !isLinkedToOccurrence(tx.id) &&
            tx.occurredOn >= from &&
            tx.occurredOn <= until
          );
        })
        .sort(
          (a, b) =>
            Math.abs(Math.abs(a.amountCents) - target) -
              Math.abs(Math.abs(b.amountCents) - target) ||
            b.occurredOn.localeCompare(a.occurredOn),
        )
        .map((tx) => ({
          transactionId: tx.id,
          description: tx.description,
          occurredOn: tx.occurredOn,
          amountCents: tx.amountCents,
          accountId: tx.accountId,
          counterparty: tx.bank?.counterparty ?? null,
        }));

      return { items };
    }),
  ),

  http.patch(
    '/api/occurrences/:id',
    handleRoute(
      { body: updateOccurrenceRequestSchema, response: occurrenceDtoSchema },
      ({ params, body }) => {
        const { record } = recurrenceOf(idOf(params));
        record.expectedAmountCents = body.expectedAmountCents;
        record.decision = null;

        return presentOccurrence(db, record);
      },
    ),
  ),

  http.post(
    '/api/occurrences/:id/payments',
    handleRoute(
      { body: linkOccurrencePaymentRequestSchema, response: occurrenceDtoSchema, status: 201 },
      ({ params, body }) => {
        const { record, recurrence } = recurrenceOf(idOf(params));
        const tx = findTransaction(db, body.transactionId);
        if (record.skippedAt) fail(422, 'OCCURRENCE_SKIPPED', 'A ocorrência está dispensada');
        if (isLinkedToOccurrence(tx.id))
          fail(409, 'OCCURRENCE_TRANSACTION_ALREADY_LINKED', 'A transação já abate uma ocorrência');
        const rightWay =
          recurrence.kind === 'income'
            ? tx.amountCents > 0 && tx.nature === 'income'
            : tx.amountCents < 0 && tx.nature === 'expense';
        if (!rightWay || tx.ignoredAt)
          fail(
            422,
            'OCCURRENCE_TRANSACTION_KIND_MISMATCH',
            'A transação não bate com o tipo da recorrência',
          );

        record.payments.push({
          id: newId(),
          transactionId: tx.id,
          amountCents: Math.abs(tx.amountCents),
          occurredOn: tx.occurredOn,
          linkedBy: 'user',
        });
        record.decision = null;
        if (tx.categoryId === null && tx.splits.length === 0 && recurrence.categoryId) {
          tx.categoryId = recurrence.categoryId;
          tx.categorySource = 'recurrence';
        }

        return presentOccurrence(db, record);
      },
    ),
  ),

  http.delete(
    '/api/occurrences/:id/payments/:paymentId',
    handleRoute({}, ({ params }) => {
      const { record } = recurrenceOf(idOf(params));
      if (!record.payments.some((payment) => payment.id === params['paymentId']))
        fail(404, 'OCCURRENCE_PAYMENT_NOT_FOUND', 'O vínculo não existe');
      record.payments = record.payments.filter((payment) => payment.id !== params['paymentId']);
      record.decision = null;
    }),
  ),

  http.post(
    '/api/occurrences/:id/settle',
    handleRoute({ response: occurrenceDtoSchema }, ({ params }) => {
      const { record } = recurrenceOf(idOf(params));
      if (record.skippedAt) fail(422, 'OCCURRENCE_SKIPPED', 'A ocorrência está dispensada');
      if (record.settledAt || presentOccurrence(db, record).status === 'confirmed')
        fail(409, 'OCCURRENCE_ALREADY_SETTLED', 'Já está paga ou recebida');
      record.settledAt = NOW_ISO;

      return presentOccurrence(db, record);
    }),
  ),

  http.post(
    '/api/occurrences/:id/unsettle',
    handleRoute({ response: occurrenceDtoSchema }, ({ params }) => {
      const { record } = recurrenceOf(idOf(params));
      if (!record.settledAt) fail(409, 'OCCURRENCE_NOT_SETTLED', 'Não foi marcada à mão');
      record.settledAt = null;

      return presentOccurrence(db, record);
    }),
  ),

  http.post(
    '/api/occurrences/:id/skip',
    handleRoute({ response: occurrenceDtoSchema }, ({ params }) => {
      const { record } = recurrenceOf(idOf(params));
      if (record.skippedAt) fail(409, 'OCCURRENCE_ALREADY_SKIPPED', 'Já está dispensada');
      if (presentOccurrence(db, record).status === 'confirmed')
        fail(409, 'OCCURRENCE_ALREADY_SETTLED', 'Já está confirmada');
      record.skippedAt = NOW_ISO;

      return presentOccurrence(db, record);
    }),
  ),

  http.post(
    '/api/occurrences/:id/unskip',
    handleRoute({ response: occurrenceDtoSchema }, ({ params }) => {
      const { record } = recurrenceOf(idOf(params));
      if (!record.skippedAt) fail(409, 'OCCURRENCE_NOT_SKIPPED', 'Não está dispensada');
      record.skippedAt = null;

      return presentOccurrence(db, record);
    }),
  ),

  http.post(
    '/api/occurrences/:id/difference',
    handleRoute(
      { body: decideOccurrenceDifferenceRequestSchema, response: occurrenceDtoSchema },
      ({ params, body }) => {
        const { record, recurrence } = recurrenceOf(idOf(params));
        const before = presentOccurrence(db, record);
        if (!before.difference)
          fail(422, 'OCCURRENCE_NO_DIFFERENCE', 'A ocorrência não tem diferença');
        if (body.decision === 'update') {
          recurrence.expectedAmountCents = before.receivedCents;
          for (const future of db.occurrences) {
            const untouched =
              future.payments.length === 0 && !future.settledAt && !future.skippedAt;
            if (future.recurrenceId === recurrence.id && future.month > record.month && untouched) {
              future.expectedAmountCents = before.receivedCents;
            }
          }
          record.decision = 'updated';
        } else {
          record.decision = 'kept';
        }

        return presentOccurrence(db, record);
      },
    ),
  ),
];
