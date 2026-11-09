import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillTransactionReader } from '#/modules/bills/application/bill-payment/bill-transaction-reader.interface.ts';
import type { LinkedElsewhereReader } from '#/modules/bills/application/bill-payment/linked-elsewhere-reader.interface.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import { matchesCounterparty } from '#/modules/bills/domain/bill-payment/matches-counterparty.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// How far back and how many: the window of the candidates (decision B3).
const WINDOW_DAYS = 90;
const MAX_CANDIDATES = 30;

// The transactions Lucas may pick as the payment of a bill: the right way (a debit of nature
// `expense` to pay, a credit of nature `income` to receive), whole, that count, not tied to any
// bill (payment or origin), invoice or occurrence, not a purchase on the credit card (the invoice
// pays it), and not dismissed for this bill, from the last
// 90 days, 30 at most. The ones whose sender or description carry the name of the person come first,
// then the most recent day first.
export class BillPaymentCandidateFinder {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly transactions: BillTransactionReader;
  private readonly linkedElsewhere: LinkedElsewhereReader | undefined;
  private readonly clock: Clock;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    transactions: BillTransactionReader,
    linkedElsewhere: LinkedElsewhereReader | undefined,
    clock: Clock,
  ) {
    this.bills = bills;
    this.transactions = transactions;
    this.linkedElsewhere = linkedElsewhere;
    this.clock = clock;
  }

  async find(input: {
    direction: BillContract.Direction;
    counterparty: string | null;
    dismissedTransactionIds: string[];
  }): Promise<BillContract.PaymentCandidateDto[]> {
    const today = this.clock.today();
    const found = await this.transactions.findCandidates({
      kind: input.direction === 'payable' ? 'expense' : 'income',
      from: today.addDays(-WINDOW_DAYS).value,
      to: today.value,
    });
    const ids = found.map((snapshot) => snapshot.id);
    const [inBills, elsewhere] = await Promise.all([
      this.bills.findLinkedTransactionIds(ids),
      this.linkedElsewhere?.findLinkedTransactionIds(ids),
    ]);
    const dismissed = new Set(input.dismissedTransactionIds);

    const free = found.filter(
      (snapshot) =>
        !snapshot.isSplit &&
        !inBills.has(snapshot.id) &&
        !elsewhere?.has(snapshot.id) &&
        !dismissed.has(snapshot.id),
    );
    const similar = (snapshot: BillTransactionReader.Snapshot) =>
      matchesCounterparty(input.counterparty, snapshot);

    return free
      .sort(
        (a, b) =>
          Number(similar(b)) - Number(similar(a)) ||
          b.occurredOn.localeCompare(a.occurredOn) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, MAX_CANDIDATES)
      .map((snapshot) => ({
        transactionId: snapshot.id,
        description: snapshot.description,
        occurredOn: snapshot.occurredOn,
        amountCents: snapshot.amountCents,
        accountId: snapshot.accountId,
        counterparty: snapshot.counterparty,
      }));
  }
}
