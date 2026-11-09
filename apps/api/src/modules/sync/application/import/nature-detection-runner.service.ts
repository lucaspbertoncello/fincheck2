import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { SyncInvoices } from '#/modules/sync/application/import/sync-invoices.interface.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';
import { detectInvoicePayments } from '#/modules/sync/domain/detection/detect-invoice-payments.util.ts';
import { detectTransfers } from '#/modules/sync/domain/detection/detect-transfers.util.ts';
import type { DetectionItem } from '#/modules/sync/domain/detection/detection-item.type.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

// How far around the new transactions the partners are looked for: the longest reach of a detector
// (a debit and the credit it pays are up to 3 days apart).
const REACH_DAYS = 3;

// The detectors of nature of the round, in the order of `domain model.md` 4.10 and 5.3: payment of
// invoice (a credit on the card, a debit on the account) first, and only then transfer, so the pair
// debit on the account and credit on the card is never taken for a transfer. It reads the
// transactions around the new ones (the partner may be older), decides in `sync` (pure functions)
// and has `transactions` write the result. Answers the final nature of each new transaction, for
// the rules that come next. Runs inside the unit of work of the round.
export class NatureDetectionRunner {
  private readonly transactions: SyncTransactions;
  private readonly invoices: SyncInvoices;

  constructor(transactions: SyncTransactions, invoices: SyncInvoices) {
    this.transactions = transactions;
    this.invoices = invoices;
  }

  async run(
    created: SyncTransactions.Created[],
    executor: Kysely<Database>,
  ): Promise<Map<string, DetectionItem['nature']>> {
    const natures = new Map<string, DetectionItem['nature']>(
      created.map((item) => [item.transactionId, item.nature]),
    );
    if (created.length === 0) return natures;

    const dates = created.map((item) => item.occurredOn).toSorted();
    const first = dates[0];
    const last = dates.at(-1);
    if (first === undefined || last === undefined) return natures;
    const newIds = new Set(created.map((item) => item.transactionId));

    const pool = await this.transactions.listDetectionPool(
      {
        from: BusinessDate.of(first).addDays(-REACH_DAYS).value,
        to: BusinessDate.of(last).addDays(REACH_DAYS).value,
      },
      executor,
    );
    const items: DetectionItem[] = pool.map((row) => ({
      id: row.transactionId,
      accountId: row.accountId,
      isCard: row.isCard,
      amountCents: row.amountCents,
      occurredOn: row.occurredOn,
      description: row.description,
      nature: row.nature,
      natureSetBy: row.natureSetBy,
      hasUserCategory: row.hasUserCategory,
      isSplit: row.isSplit,
      isLinked: row.isLinked,
      isNew: newIds.has(row.transactionId),
    }));

    const payments = detectInvoicePayments({
      items,
      invoices: await this.invoices.listPayable(executor),
    });
    const transfers = detectTransfers({ items, excluded: new Set(payments) });
    if (payments.length === 0 && transfers.length === 0) return natures;

    const applied = await this.transactions.applyDetectedNatures({ payments, transfers }, executor);
    for (const id of applied.payments) {
      if (natures.has(id)) natures.set(id, 'invoice_payment');
    }
    for (const id of applied.transfers) {
      if (natures.has(id)) natures.set(id, 'transfer');
    }

    return natures;
  }
}
