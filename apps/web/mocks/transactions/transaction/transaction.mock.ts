import { normalizeDescription } from '@fincheck/shared/common/text/normalize-description.util.ts';
import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import {
  reviewQueueDtoSchema,
  reviewQueueQuerySchema,
} from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import {
  bulkTransactionsRequestSchema,
  bulkTransactionsResultSchema,
  restoreBulkRequestSchema,
  restoreBulkResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';
import {
  transactionSummaryDtoSchema,
  transactionSummaryQuerySchema,
} from '@fincheck/shared/transactions/transaction-summary/transaction-summary.schema.ts';
import {
  createTransactionRequestSchema,
  listTransactionsQuerySchema,
  listTransactionsResponseSchema,
  resolveBankChangeRequestSchema,
  splitTransactionRequestSchema,
  transactionDtoSchema,
  updateTransactionRequestSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { http } from 'msw';

import { findAccount } from '#mocks/accounts/account/find-account.util.ts';
import { findCategory } from '#mocks/categories/category/find-category.util.ts';
import { findTag } from '#mocks/categories/tag/find-tag.util.ts';
import { invoiceMonthFor } from '#mocks/invoices/invoice/invoice-month-for.util.ts';
import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { NOW_ISO } from '#mocks/support/dates/mock-clock.store.ts';
import { fail } from '#mocks/support/http/fail.util.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import { assertNatureChange } from '#mocks/transactions/transaction/assert-nature-change.util.ts';
import { assertTransferCounterpart } from '#mocks/transactions/transaction/assert-transfer-counterpart.util.ts';
import { assertUsableCategory } from '#mocks/transactions/transaction/assert-usable-category.util.ts';
import { assertUsableTags } from '#mocks/transactions/transaction/assert-usable-tags.util.ts';
import { buildLines } from '#mocks/transactions/transaction/build-lines.util.ts';
import { compareTransactionKeys } from '#mocks/transactions/transaction/compare-transaction-keys.util.ts';
import { competenceOn } from '#mocks/transactions/transaction/competence-on.util.ts';
import { countsInAccounts } from '#mocks/transactions/transaction/counts-in-accounts.util.ts';
import { decodeTransactionCursor } from '#mocks/transactions/transaction/decode-transaction-cursor.util.ts';
import {
  encodeTransactionCursor,
  type TransactionCursorKey,
} from '#mocks/transactions/transaction/encode-transaction-cursor.util.ts';
import { findRecurrenceCandidates } from '#mocks/transactions/transaction/find-recurrence-candidates.util.ts';
import { findTransaction } from '#mocks/transactions/transaction/find-transaction.util.ts';
import { isInReview } from '#mocks/transactions/transaction/is-in-review.util.ts';
import { linkTransferLegs } from '#mocks/transactions/transaction/link-transfer-legs.util.ts';
import { presentTransaction } from '#mocks/transactions/transaction/present-transaction.util.ts';
import { remakeInvoiceMonth } from '#mocks/transactions/transaction/remake-invoice-month.util.ts';
import { suggestCategories } from '#mocks/transactions/transaction/suggest-categories.util.ts';
import { toPreviousState } from '#mocks/transactions/transaction/to-previous-state.util.ts';
import { unlinkTransfer } from '#mocks/transactions/transaction/unlink-transfer.util.ts';

const OUTSIDE = new Set([
  'transfer',
  'invoice_payment',
  'balance_adjustment',
  'lent',
  'reimbursed',
]);

function present(tx: MockState.TransactionRecord) {
  tx.updatedAt = NOW_ISO;

  return presentTransaction(db, tx);
}

function isBillLinkedSplit(tx: MockState.TransactionRecord): boolean {
  return db.bills.some((bill) => bill.origin?.transactionId === tx.id);
}

export const transactionMock = [
  http.get(
    '/api/transactions',
    handleRoute(
      { query: listTransactionsQuerySchema, response: listTransactionsResponseSchema },
      ({ query }) => {
        if (query.accountId) findAccount(db, query.accountId);
        const search = query.search ? normalizeText(query.search) : null;
        const filtered = db.transactions
          .filter((tx) => !query.month || competenceOn(db, tx).slice(0, 7) === query.month)
          .filter((tx) => !query.from || competenceOn(db, tx) >= query.from)
          .filter((tx) => !query.to || competenceOn(db, tx) <= query.to)
          .filter((tx) => !query.accountId || tx.accountId === query.accountId)
          .filter(
            (tx) =>
              !query.categoryId ||
              tx.categoryId === query.categoryId ||
              tx.splits.some((part) => part.categoryId === query.categoryId),
          )
          .filter(
            (tx) => query.uncategorized === undefined || isInReview(tx) === query.uncategorized,
          )
          .filter((tx) => !query.tagId || tx.tagIds.includes(query.tagId))
          .filter((tx) => !query.ruleId || tx.categoryRuleId === query.ruleId)
          .filter(
            (tx) =>
              !query.direction ||
              (query.direction === 'out' ? tx.amountCents < 0 : tx.amountCents > 0),
          )
          .filter(
            (tx) => !query.installmentPlanId || tx.installment?.planId === query.installmentPlanId,
          )
          .filter(
            (tx) =>
              !search ||
              normalizeText(
                `${tx.description} ${tx.bank?.description ?? ''} ${tx.bank?.counterparty ?? ''}`,
              ).includes(search),
          );
        const keyOf = (tx: MockState.TransactionRecord): TransactionCursorKey => [
          competenceOn(db, tx),
          tx.occurredOn,
          tx.createdAt,
          tx.id,
        ];
        // The contract orders by competence, day, creation and id, newest first, in a month too.
        const rows = filtered.sort((a, b) => compareTransactionKeys(keyOf(a), keyOf(b)));

        if (query.month)
          return { items: rows.map((tx) => presentTransaction(db, tx)), nextCursor: null };
        // The cursor is the key of the last row of the page: the next page starts after it.
        const after = query.cursor ? decodeTransactionCursor(query.cursor) : null;
        const start = after
          ? rows.findIndex((tx) => compareTransactionKeys(keyOf(tx), after) > 0)
          : 0;
        const from = start === -1 ? rows.length : start;
        const limit = query.limit ?? 100;
        const page = rows.slice(from, from + limit);
        const last = page.at(-1);

        return {
          items: page.map((tx) => presentTransaction(db, tx)),
          nextCursor:
            last && from + limit < rows.length ? encodeTransactionCursor(keyOf(last)) : null,
        };
      },
    ),
  ),

  http.get(
    '/api/transactions/summary',
    handleRoute(
      { query: transactionSummaryQuerySchema, response: transactionSummaryDtoSchema },
      ({ query }) => {
        const lines = buildLines(db).filter(
          (line) => line.competenceOn.slice(0, 7) === query.month,
        );
        let outsideCents = 0;
        for (const tx of db.transactions) {
          if (!countsInAccounts(tx) || competenceOn(db, tx).slice(0, 7) !== query.month) continue;
          if (tx.splits.length > 0) {
            outsideCents += tx.splits
              .filter((part) => part.nature === 'lent' || part.nature === 'reimbursed')
              .reduce((sum, part) => sum + Math.abs(part.amountCents), 0);
          } else if (OUTSIDE.has(tx.nature)) {
            // Only the leg that leaves, so the same money is not counted twice.
            if ((tx.nature === 'transfer' || tx.nature === 'invoice_payment') && tx.amountCents > 0)
              continue;
            outsideCents += Math.abs(tx.amountCents);
          }
        }
        const review = db.transactions.filter(
          (tx) => isInReview(tx) && competenceOn(db, tx).slice(0, 7) === query.month,
        );

        return {
          month: query.month,
          expensesCents: lines
            .filter((line) => line.nature === 'expense')
            .reduce((sum, line) => sum - line.amountCents, 0),
          incomesCents: lines
            .filter((line) => line.nature === 'income')
            .reduce((sum, line) => sum + line.amountCents, 0),
          outsideCents,
          reviewCount: review.length,
          reviewTotalCents: review.reduce((sum, tx) => sum + Math.abs(tx.amountCents), 0),
        };
      },
    ),
  ),

  http.get(
    '/api/transactions/review-queue',
    handleRoute({ query: reviewQueueQuerySchema, response: reviewQueueDtoSchema }, ({ query }) => {
      ensureOccurrences(db);
      const queue = db.transactions
        .filter(
          (tx) =>
            isInReview(tx) && (!query.month || competenceOn(db, tx).slice(0, 7) === query.month),
        )
        .sort(
          (a, b) =>
            a.occurredOn.localeCompare(b.occurredOn) ||
            a.createdAt.localeCompare(b.createdAt) ||
            a.id.localeCompare(b.id),
        );

      return {
        total: queue.length,
        items: queue.slice(0, query.limit ?? 50).map((tx) => {
          return {
            transaction: presentTransaction(db, tx),
            categorySuggestions: suggestCategories(db, tx),
            recurrenceCandidates: findRecurrenceCandidates(db, tx),
            rulePattern: normalizeDescription(tx.description),
          };
        }),
      };
    }),
  ),

  http.post(
    '/api/transactions/bulk',
    handleRoute(
      { body: bulkTransactionsRequestSchema, response: bulkTransactionsResultSchema },
      ({ body }) => {
        const { action } = body;
        if (action.type === 'categorize') {
          if (findCategory(db, action.categoryId).archivedAt)
            fail(422, 'TRANSACTION_CATEGORY_ARCHIVED', 'Categoria arquivada');
        }
        if (action.type === 'addTag') {
          if (findTag(db, action.tagId).archivedAt)
            fail(422, 'TRANSACTION_TAG_ARCHIVED', 'Tag arquivada');
        }

        const skipped: TransactionBulk.Result['skipped'] = [];
        const previous: TransactionBulk.Result['previous'] = [];
        for (const transactionId of body.transactionIds) {
          const tx = db.transactions.find((item) => item.id === transactionId);
          if (!tx) {
            skipped.push({ transactionId, reason: 'not_found' });
            continue;
          }
          if (action.type === 'categorize') {
            const category = findCategory(db, action.categoryId);
            if (tx.splits.length > 0) skipped.push({ transactionId, reason: 'split' });
            else if (tx.nature !== 'expense' && tx.nature !== 'income')
              skipped.push({ transactionId, reason: 'outside_account' });
            else if (tx.nature !== category.kind)
              skipped.push({ transactionId, reason: 'category_kind_mismatch' });
            else if (tx.categoryId === category.id && tx.categorySource === 'user')
              skipped.push({ transactionId, reason: 'no_change' });
            else {
              previous.push(toPreviousState(tx));
              Object.assign(tx, {
                categoryId: category.id,
                categorySource: 'user',
                categoryRuleId: null,
              });
            }
          } else if (action.type === 'addTag') {
            if (tx.tagIds.includes(action.tagId))
              skipped.push({ transactionId, reason: 'no_change' });
            else {
              previous.push(toPreviousState(tx));
              tx.tagIds = [...tx.tagIds, action.tagId];
            }
          } else if (tx.ignoredAt) skipped.push({ transactionId, reason: 'no_change' });
          else {
            previous.push(toPreviousState(tx));
            tx.ignoredAt = NOW_ISO;
          }
        }

        return { updatedCount: previous.length, skipped, previous };
      },
    ),
  ),

  http.post(
    '/api/transactions/bulk/restore',
    handleRoute(
      { body: restoreBulkRequestSchema, response: restoreBulkResultSchema },
      ({ body }) => {
        // The body is what a previous action returned, but nothing proves it: a category or a tag
        // that does not exist is the 404 of its owner, a category without origin or of the other
        // kind is a 400 (`mock vs api.md` 39).
        for (const categoryId of new Set(body.items.flatMap((item) => item.categoryId ?? [])))
          findCategory(db, categoryId);
        for (const tagId of new Set(body.items.flatMap((item) => item.tagIds))) findTag(db, tagId);
        body.items.forEach((item, index) => {
          if (item.categoryId === null) return;
          if (item.categorySource === null)
            fail(400, 'VALIDATION_FAILED', 'Entrada fora do contrato', {
              issues: [
                { path: `items.${index}.categorySource`, message: 'A category needs its origin.' },
              ],
            });
          const tx = db.transactions.find((entry) => entry.id === item.transactionId);
          if (
            tx &&
            (tx.nature === 'expense' || tx.nature === 'income') &&
            tx.splits.length === 0 &&
            findCategory(db, item.categoryId).kind !== tx.nature
          )
            fail(400, 'VALIDATION_FAILED', 'Entrada fora do contrato', {
              issues: [
                {
                  path: `items.${index}.categoryId`,
                  message: 'The category is of the other kind.',
                },
              ],
            });
        });

        let restoredCount = 0;
        for (const item of body.items) {
          const tx = db.transactions.find((entry) => entry.id === item.transactionId);
          if (!tx) continue;
          // The category only fits a whole expense or income: if the nature changed since, or the
          // transaction was split, the saved category is dropped.
          const keepsCategory =
            item.categoryId !== null &&
            (tx.nature === 'expense' || tx.nature === 'income') &&
            tx.splits.length === 0;
          tx.categoryId = keepsCategory ? item.categoryId : null;
          tx.categorySource = keepsCategory ? item.categorySource : null;
          tx.categoryRuleId =
            keepsCategory && db.rules.some((rule) => rule.id === item.categoryRuleId)
              ? item.categoryRuleId
              : null;
          tx.tagIds = [...new Set(item.tagIds)];
          tx.ignoredAt = item.ignoredAt;
          tx.updatedAt = NOW_ISO;
          restoredCount += 1;
        }

        return { restoredCount };
      },
    ),
  ),

  http.get(
    '/api/transactions/:id',
    handleRoute({ response: transactionDtoSchema }, ({ params }) =>
      presentTransaction(db, findTransaction(db, params['id'] ?? '')),
    ),
  ),

  http.post(
    '/api/transactions',
    handleRoute(
      { body: createTransactionRequestSchema, response: transactionDtoSchema, status: 201 },
      ({ body }) => {
        const account = findAccount(db, body.accountId);
        if (account.archivedAt) fail(422, 'TRANSACTION_ACCOUNT_ARCHIVED', 'A conta está arquivada');
        const isCard = account.type === 'credit_card';
        if ((body.method === 'credit') !== isCard)
          fail(
            422,
            'TRANSACTION_METHOD_ACCOUNT_MISMATCH',
            'Meio de pagamento e conta não combinam',
          );
        if (body.categoryId) assertUsableCategory(db, body.categoryId, body.type);
        for (const tagId of body.tagIds ?? []) findTag(db, tagId);
        assertUsableTags(db, body.tagIds ?? []);

        const record = makeTransactionRecord({
          accountId: account.id,
          origin: 'manual',
          nature: body.type,
          natureSetBy: 'user',
          method: body.method,
          description: body.description,
          amountCents: body.type === 'expense' ? -body.amountCents : body.amountCents,
          occurredOn: body.occurredOn,
          categoryId: body.categoryId ?? null,
          categorySource: 'user',
          tagIds: body.tagIds ?? [],
          invoiceMonth:
            isCard && account.creditCard
              ? invoiceMonthFor(account.creditCard.closingDay, body.occurredOn)
              : null,
        });
        db.transactions.push(record);

        return presentTransaction(db, record);
      },
    ),
  ),

  http.patch(
    '/api/transactions/:id',
    handleRoute(
      { body: updateTransactionRequestSchema, response: transactionDtoSchema },
      ({ params, body }) => {
        const tx = findTransaction(db, params['id'] ?? '');
        if (body.transferCounterpartId && body.nature !== 'transfer') {
          fail(400, 'VALIDATION_FAILED', 'Entrada fora do contrato', {
            issues: [
              {
                path: 'transferCounterpartId',
                message: 'A outra perna só vale junto com nature "transfer".',
              },
            ],
          });
        }
        if (
          tx.splits.length > 0 &&
          ((body.categoryId !== undefined && body.categoryId !== null) ||
            body.amountCents !== undefined ||
            body.nature !== undefined)
        ) {
          fail(422, 'TRANSACTION_IS_SPLIT', 'Desfaça a divisão antes');
        }
        const account = findAccount(db, tx.accountId);

        // Every check comes before the first write, as the API rolls back what it did.
        if (body.nature !== undefined) assertNatureChange(db, tx, body.nature);
        const counterpart =
          body.nature === 'transfer' && body.transferCounterpartId
            ? findTransaction(db, body.transferCounterpartId)
            : null;
        const takesCounterpart =
          counterpart !== null && tx.transferCounterpartId !== counterpart.id;
        if (counterpart && takesCounterpart) assertTransferCounterpart(db, tx, counterpart);
        // The whole `lent` transaction is the origin of a debt: its value is the friend's part.
        if (body.amountCents !== undefined && tx.nature === 'lent') {
          fail(
            422,
            'TRANSACTION_LINKED_TO_BILL',
            'A transação está ligada a uma conta: desfaça o vínculo antes de mudar a natureza ou o valor.',
          );
        }
        const nature = body.nature ?? tx.nature;
        if (body.categoryId) {
          if (nature !== 'expense' && nature !== 'income')
            fail(
              422,
              'TRANSACTION_CATEGORY_NOT_ALLOWED',
              'Natureza fora da conta não tem categoria',
            );
          assertUsableCategory(db, body.categoryId, nature);
        }
        if (body.tagIds) {
          for (const tagId of body.tagIds.filter((id) => !tx.tagIds.includes(id)))
            findTag(db, tagId);
          assertUsableTags(
            db,
            body.tagIds.filter((id) => !tx.tagIds.includes(id)),
          );
        }

        if (body.nature !== undefined) {
          tx.nature = body.nature;
          tx.natureSetBy = 'user';
          if (body.nature === 'transfer') {
            tx.categoryId = null;
            tx.categorySource = null;
            tx.categoryRuleId = null;
          }
          // Leaving the transfer, or saying there is no other leg, cuts the link.
          if (body.nature !== 'transfer' || body.transferCounterpartId === null)
            unlinkTransfer(db, tx);
          if (counterpart && takesCounterpart) linkTransferLegs(db, tx, counterpart);
        } else if (body.transferCounterpartId === null) {
          unlinkTransfer(db, tx);
        }
        if (body.description !== undefined) tx.description = body.description;
        if (body.amountCents !== undefined) {
          tx.amountCents = tx.amountCents < 0 ? -body.amountCents : body.amountCents;
          // The other leg of a transfer follows the new amount, with the opposite sign.
          const other = db.transactions.find((item) => item.id === tx.transferCounterpartId);
          if (other?.transferCounterpartId === tx.id) other.amountCents = -tx.amountCents;
        }
        if (body.occurredOn !== undefined) {
          tx.occurredOn = body.occurredOn;
          if (account.creditCard && !tx.installment)
            tx.invoiceMonth = invoiceMonthFor(account.creditCard.closingDay, body.occurredOn);
        }
        if (body.categoryId !== undefined) {
          tx.categoryId = body.categoryId;
          tx.categorySource = body.categoryId ? 'user' : null;
          tx.categoryRuleId = null;
        }
        if (body.tagIds !== undefined) tx.tagIds = body.tagIds;
        if (body.editNote !== undefined) tx.editNote = body.editNote;

        return present(tx);
      },
    ),
  ),

  http.delete(
    '/api/transactions/:id',
    handleRoute({}, ({ params }) => {
      const tx = findTransaction(db, params['id'] ?? '');
      if (tx.origin === 'bank') fail(422, 'TRANSACTION_NOT_MANUAL', 'A importada se ignora');
      if (tx.installment) fail(422, 'TRANSACTION_IS_INSTALLMENT', 'Exclua o plano de parcelas');
      // The other leg of a transfer goes back to expense or income by its sign, with no pair.
      const other = db.transactions.find((item) => item.id === tx.transferCounterpartId);
      if (other) {
        const isCard = db.accounts.find((account) => account.id === other.accountId)?.creditCard;
        other.transferCounterpartId = null;
        other.nature = other.amountCents < 0 || isCard ? 'expense' : 'income';
        other.natureSetBy = 'system';
        other.updatedAt = NOW_ISO;
      }
      db.transactions = db.transactions.filter((item) => item.id !== tx.id);
      for (const invoice of db.invoices)
        invoice.payments = invoice.payments.filter((payment) => payment.transactionId !== tx.id);
      for (const occurrence of db.occurrences)
        occurrence.payments = occurrence.payments.filter(
          (payment) => payment.transactionId !== tx.id,
        );
      for (const bill of db.bills) {
        bill.payments = bill.payments.filter((payment) => payment.transactionId !== tx.id);
        if (bill.origin?.transactionId === tx.id) bill.origin = null;
      }
    }),
  ),

  http.post(
    '/api/transactions/:id/restore-original',
    handleRoute({ response: transactionDtoSchema }, ({ params }) => {
      const tx = findTransaction(db, params['id'] ?? '');
      if (!tx.bank) fail(422, 'TRANSACTION_NOT_FROM_BANK', 'A transação é manual');
      const dateBefore = tx.occurredOn;
      if (tx.splits.length > 0 && tx.bank.amountCents !== tx.amountCents)
        fail(422, 'TRANSACTION_IS_SPLIT', 'A divisão quebraria');
      tx.description = tx.bank.description;
      tx.amountCents = tx.bank.amountCents;
      tx.occurredOn = tx.bank.occurredOn;
      tx.editNote = null;
      tx.bankChange = null;
      remakeInvoiceMonth(db, tx, dateBefore);

      return present(tx);
    }),
  ),

  http.post(
    '/api/transactions/:id/bank-change/resolve',
    handleRoute(
      { body: resolveBankChangeRequestSchema, response: transactionDtoSchema },
      ({ params, body }) => {
        const tx = findTransaction(db, params['id'] ?? '');
        const dateBefore = tx.occurredOn;
        if (!tx.bankChange && !tx.removedByBankAt)
          fail(422, 'TRANSACTION_NO_BANK_CHANGE', 'Não há mudança do banco');
        const changesAmount =
          tx.bankChange?.changes.some((change) => change.field === 'amountCents') ?? false;
        // Taking the bank's version changes the amount of a split one when the bank changed it, or
        // when it removed the transaction and Lucas had edited the amount.
        if (
          body.use === 'bank' &&
          tx.splits.length > 0 &&
          (changesAmount ||
            (tx.removedByBankAt && tx.bank && tx.amountCents !== tx.bank.amountCents))
        )
          fail(422, 'TRANSACTION_IS_SPLIT', 'A divisão quebraria');
        if (body.use === 'bank') {
          for (const change of tx.bankChange?.changes ?? []) {
            if (change.field === 'amountCents') tx.amountCents = change.after;
            else if (change.field === 'description') tx.description = change.after;
            else tx.occurredOn = change.after;
          }
          // Accepting the removal means going back to the bank's version, so it leaves the accounts.
          if (tx.removedByBankAt && tx.bank) {
            tx.description = tx.bank.description;
            tx.amountCents = tx.bank.amountCents;
            tx.occurredOn = tx.bank.occurredOn;
          }
          remakeInvoiceMonth(db, tx, dateBefore);
        } else {
          tx.removedByBankAt = null;
        }
        tx.bankChange = null;

        return present(tx);
      },
    ),
  ),

  http.post(
    '/api/transactions/:id/ignore',
    handleRoute({ response: transactionDtoSchema }, ({ params }) => {
      const tx = findTransaction(db, params['id'] ?? '');
      if (tx.ignoredAt) fail(409, 'TRANSACTION_ALREADY_IGNORED', 'Já está ignorada');
      tx.ignoredAt = NOW_ISO;

      return present(tx);
    }),
  ),

  http.post(
    '/api/transactions/:id/unignore',
    handleRoute({ response: transactionDtoSchema }, ({ params }) => {
      const tx = findTransaction(db, params['id'] ?? '');
      if (!tx.ignoredAt) fail(409, 'TRANSACTION_NOT_IGNORED', 'Não está ignorada');
      tx.ignoredAt = null;

      return present(tx);
    }),
  ),

  http.put(
    '/api/transactions/:id/splits',
    handleRoute(
      { body: splitTransactionRequestSchema, response: transactionDtoSchema },
      ({ params, body }) => {
        const tx = findTransaction(db, params['id'] ?? '');
        if (tx.nature !== 'expense' && tx.nature !== 'income')
          fail(422, 'TRANSACTION_SPLIT_NOT_ALLOWED', 'Natureza fora de despesa e receita');
        if (isBillLinkedSplit(tx))
          fail(
            422,
            'TRANSACTION_SPLIT_LINKED_TO_BILL',
            'A parte do amigo está ligada a uma dívida',
          );
        const total = body.parts.reduce((sum, part) => sum + part.amountCents, 0);
        if (total !== Math.abs(tx.amountCents))
          fail(422, 'TRANSACTION_SPLIT_SUM_MISMATCH', 'A soma das partes difere do valor');
        for (const part of body.parts)
          if (part.categoryId) assertUsableCategory(db, part.categoryId, tx.nature);

        const sign = tx.amountCents < 0 ? -1 : 1;
        const nature = tx.nature;
        tx.splits = body.parts.map((part, index) => ({
          id: newId(),
          position: index + 1,
          amountCents: sign * part.amountCents,
          nature,
          categoryId: part.categoryId ?? null,
          description: part.description ?? null,
        }));
        tx.categoryId = null;
        tx.categorySource = null;
        tx.categoryRuleId = null;

        return present(tx);
      },
    ),
  ),

  http.delete(
    '/api/transactions/:id/splits',
    handleRoute({ response: transactionDtoSchema }, ({ params }) => {
      const tx = findTransaction(db, params['id'] ?? '');
      if (tx.splits.length === 0) fail(409, 'TRANSACTION_NOT_SPLIT', 'Não está dividida');
      if (isBillLinkedSplit(tx))
        fail(422, 'TRANSACTION_SPLIT_LINKED_TO_BILL', 'A parte do amigo está ligada a uma dívida');
      tx.splits = [];
      tx.categoryId = null;
      tx.categorySource = null;
      tx.categoryRuleId = null;

      return present(tx);
    }),
  ),
];
