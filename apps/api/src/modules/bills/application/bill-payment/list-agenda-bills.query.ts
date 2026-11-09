import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';
import type { LinkedElsewhereReader } from '#/modules/bills/application/bill-payment/linked-elsewhere-reader.interface.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import {
  AMOUNT_TOLERANCE_CENTS,
  findPresumedBillPayment,
} from '#/modules/bills/domain/bill-payment/find-presumed-bill-payment.util.ts';
import { pickPresumedBillOwners } from '#/modules/bills/domain/bill-payment/pick-presumed-bill-owners.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';

const DAYS_AFTER_DUE = 5;
// How many ids go in one `IN (...)`: SQLite takes a limited number of variables per statement.
const LINK_LOOKUP_BATCH = 500;

// Every bill with its presumed payment, for the agenda and the Livre of `dashboard`, which asks it
// through its `AgendaBillReader` (this class satisfies it). The presumed payment is the transaction
// that most likely paid an open bill with a due day and still has no link (see
// `findPresumedBillPayment`): the money already left the balance, so the Livre does not count the
// bill again. A transaction that already pays a bill, an invoice or an occurrence, one that is split
// and one dismissed for this bill never presume; a transaction presumes at most one bill, the one
// that falls due first.
export class ListAgendaBillsQuery {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly builder: BillDtoBuilder;
  private readonly transactions: BillTransactionReader;
  private readonly linkedElsewhere: LinkedElsewhereReader | undefined;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    builder: BillDtoBuilder,
    transactions: BillTransactionReader,
    linkedElsewhere: LinkedElsewhereReader | undefined,
  ) {
    this.bills = bills;
    this.builder = builder;
    this.transactions = transactions;
    this.linkedElsewhere = linkedElsewhere;
  }

  async listBills(): Promise<ListAgendaBillsQuery.Item[]> {
    const all = await this.bills.findAll();
    const dtos = await this.builder.buildMany(all);
    const waiting = all.flatMap((bill, index) => {
      const dto = dtos[index];
      if (!dto || dto.status === 'settled' || dto.dueOn === null || dto.remainingCents <= 0) {
        return [];
      }

      return [{ bill, dto, dueOn: dto.dueOn }];
    });

    const claims: { billId: string; transactionId: string; dueOn: string; createdAt: string }[] =
      [];
    const found = new Map<string, ListAgendaBillsQuery.Presumed>();
    for (const direction of ['payable', 'receivable'] as const) {
      const mine = waiting.filter((entry) => entry.dto.direction === direction);
      if (mine.length === 0) continue;

      const pool = await this.freeCandidates(
        direction === 'payable' ? 'expense' : 'income',
        mine.map((entry) => businessDateOfInstant(entry.dto.createdAt).value).toSorted()[0] ?? '',
        mine
          .map((entry) => BusinessDate.of(entry.dueOn).addDays(DAYS_AFTER_DUE).value)
          .toSorted()
          .at(-1) ?? '',
        mine.map((entry) => entry.dto.remainingCents),
      );

      for (const { bill, dto, dueOn } of mine) {
        const dismissed = new Set(bill.dismissedTransactionIds);
        const candidate = findPresumedBillPayment({
          counterparty: dto.counterparty,
          remainingCents: dto.remainingCents,
          dueOn,
          createdAt: dto.createdAt,
          candidates: pool.filter((item) => !dismissed.has(item.id)),
        });
        if (!candidate) continue;

        claims.push({
          billId: dto.id,
          transactionId: candidate.id,
          dueOn,
          createdAt: dto.createdAt,
        });
        found.set(dto.id, {
          transactionId: candidate.id,
          accountId: candidate.accountId,
          amountCents: candidate.amountCents,
          occurredOn: candidate.occurredOn,
          description: candidate.description,
        });
      }
    }

    const owners = pickPresumedBillOwners(claims);

    return dtos.map((bill) => ({
      bill,
      presumed: owners.has(bill.id) ? (found.get(bill.id) ?? null) : null,
    }));
  }

  // The transactions of the right direction between two days that are whole, tied to nothing and
  // worth, give or take the tolerance, what some bill still lacks (`wantedCents`): the only ones
  // that may be a payment, so the links are asked of those and not of the whole history, which
  // grows with the oldest open bill. The ids go to the links in batches.
  private async freeCandidates(
    kind: 'income' | 'expense',
    from: string,
    to: string,
    wantedCents: number[],
  ) {
    const found = (await this.transactions.findCandidates({ kind, from, to })).filter(
      (snapshot) =>
        !snapshot.isSplit &&
        wantedCents.some(
          (wanted) => Math.abs(Math.abs(snapshot.amountCents) - wanted) <= AMOUNT_TOLERANCE_CENTS,
        ),
    );
    const linked = new Set<string>();
    for (let start = 0; start < found.length; start += LINK_LOOKUP_BATCH) {
      const ids = found.slice(start, start + LINK_LOOKUP_BATCH).map((snapshot) => snapshot.id);
      const [inBills, elsewhere] = await Promise.all([
        this.bills.findLinkedTransactionIds(ids),
        this.linkedElsewhere?.findLinkedTransactionIds(ids),
      ]);
      for (const id of inBills) linked.add(id);
      for (const id of elsewhere ?? []) linked.add(id);
    }

    return found
      .filter((snapshot) => !linked.has(snapshot.id))
      .map((snapshot) => ({
        id: snapshot.id,
        accountId: snapshot.accountId,
        amountCents: snapshot.amountCents,
        occurredOn: snapshot.occurredOn,
        description: snapshot.description,
        bankDescription: snapshot.bankDescription,
        counterparty: snapshot.counterparty,
      }));
  }
}

export namespace ListAgendaBillsQuery {
  export type Presumed = {
    transactionId: string;
    accountId: string;
    // With sign.
    amountCents: number;
    occurredOn: string;
    description: string;
  };

  export type Item = { bill: BillContract.Dto; presumed: Presumed | null };
}
