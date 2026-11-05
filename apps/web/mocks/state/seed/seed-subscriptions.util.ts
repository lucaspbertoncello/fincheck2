import { computeOccurrenceWindow } from '#mocks/recurrences/occurrence/compute-occurrence-window.util.ts';
import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { invoiceMonthFor } from '#mocks/invoices/invoice/invoice-month-for.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import type { SeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { toInstant } from '#mocks/support/dates/to-instant.util.ts';

interface SubscriptionSeed {
  name: string;
  matchText: string;
  // What the card statement says.
  description: string;
  expectedCents: number;
  categoryKey: 'assinaturas' | 'educacao' | 'lazer';
  // The day of the charge, this many days before today (never before the 1st).
  daysAgo: number;
  // What this month charged; null when it did not charge.
  thisMonthCents: number | null;
  // Ended some days ago.
  endedDaysAgo?: number;
}

// Streamflix (charged) and Plano celular (still to come) come from `seedRecurrences`; these add the
// other cases of the Assinaturas tab: a price that went up, one that did not charge, one that was
// ended and charged anyway. Names and amounts are made up.
const SUBSCRIPTIONS: readonly SubscriptionSeed[] = [
  {
    name: 'Musicando',
    matchText: 'MUSICANDO',
    description: 'MUSICANDO PREMIUM',
    expectedCents: 2190,
    categoryKey: 'assinaturas',
    daysAgo: 4,
    thisMonthCents: 2490,
  },
  {
    name: 'Nuvem+ 200 GB',
    matchText: 'NUVEM MAIS',
    description: 'NUVEM MAIS ARMAZENAMENTO',
    expectedCents: 1990,
    categoryKey: 'assinaturas',
    daysAgo: 8,
    thisMonthCents: null,
  },
  {
    name: 'Treina Cursos',
    matchText: 'TREINA CURSOS',
    description: 'TREINA CURSOS ONLINE',
    expectedCents: 7900,
    categoryKey: 'educacao',
    daysAgo: 2,
    thisMonthCents: 7900,
  },
  {
    name: 'Revista Digital',
    matchText: 'REVISTA DIGITAL',
    description: 'REVISTA DIGITAL ASSINATURA',
    expectedCents: 3490,
    categoryKey: 'lazer',
    daysAgo: 3,
    thisMonthCents: 3490,
    endedDaysAgo: 12,
  },
];

// Card purchases that come back every month but have no recurrence: the tab suggests them.
const REPEATED_PURCHASES: ReadonlyArray<{
  description: string;
  categoryKey: 'assinaturas' | 'lazer';
  daysAgo: number;
  amounts: readonly number[];
}> = [
  // Oldest month first; the last one is this month.
  { description: 'LEITURA MENSAL CLUBE', categoryKey: 'lazer', daysAgo: 9, amounts: [3290, 3290] },
  {
    description: 'PODCAST PLUS',
    categoryKey: 'assinaturas',
    daysAgo: 11,
    amounts: [1790, 1790, 1990],
  },
];

// A charge that lands on an invoice already paid raises that payment (and the bank debit behind
// it) by the same amount, so the paid invoices of the seed stay paid.
function absorbInPaidInvoice(database: MockState.Database, tx: MockState.TransactionRecord): void {
  const row = database.invoices.find(
    (item) => item.accountId === tx.accountId && item.month === tx.invoiceMonth,
  );
  const payment = row?.payments[0];
  if (!payment) return;
  const cents = Math.abs(tx.amountCents);
  payment.amountCents += cents;
  const debit = database.transactions.find((item) => item.id === payment.transactionId);
  if (debit) debit.amountCents -= cents;
}

// The subscriptions on the Nubank card of the seed. Runs last, so the ids of everything before it
// stay the same.
export function seedSubscriptions(database: MockState.Database, ids: SeedIds): void {
  const { acc, cat } = ids;
  const nuCard = database.accounts.find((account) => account.id === acc.nuCartao)?.creditCard;
  if (!nuCard) throw new Error('Seed: Nubank card missing');
  const previous = addMonths(CURRENT_MONTH, -1);
  const startsMonth = addMonths(CURRENT_MONTH, -3);
  const today = dayOf(TODAY);

  const charge = (
    description: string,
    categoryKey: SubscriptionSeed['categoryKey'],
    occurredOn: string,
    amountCents: number,
  ) => {
    const tx = makeTransactionRecord({
      accountId: acc.nuCartao,
      method: 'credit',
      description,
      amountCents: -amountCents,
      occurredOn,
      categoryId: cat[categoryKey],
      categorySource: 'recurrence',
      invoiceMonth: invoiceMonthFor(nuCard.closingDay, occurredOn),
    });
    database.transactions.push(tx);
    absorbInPaidInvoice(database, tx);

    return tx;
  };
  const occurrenceOf = (recurrence: MockState.RecurrenceRecord, month: string) => {
    const record: MockState.OccurrenceRecord = {
      id: newId(),
      recurrenceId: recurrence.id,
      month,
      ...computeOccurrenceWindow(recurrence.dateRule, month),
      expectedAmountCents: recurrence.expectedAmountCents,
      settledAt: null,
      skippedAt: null,
      decision: null,
      payments: [],
    };
    database.occurrences.push(record);

    return record;
  };
  const link = (occurrence: MockState.OccurrenceRecord, tx: MockState.TransactionRecord) => {
    occurrence.payments.push({
      id: newId(),
      transactionId: tx.id,
      amountCents: Math.abs(tx.amountCents),
      occurredOn: tx.occurredOn,
      linkedBy: 'auto',
    });
  };

  const created: Array<{ seed: SubscriptionSeed; recurrence: MockState.RecurrenceRecord }> = [];
  for (const seed of SUBSCRIPTIONS) {
    const day = Math.max(1, today - seed.daysAgo);
    const createdAt = toInstant(`${startsMonth}-01`);
    const recurrence: MockState.RecurrenceRecord = {
      id: newId(),
      kind: 'expense',
      name: seed.name,
      expectedAmountCents: seed.expectedCents,
      amountMode: 'fixed',
      counterparty: null,
      matchText: seed.matchText,
      employmentRegime: null,
      accountId: acc.nuCartao,
      method: 'credit',
      categoryId: cat[seed.categoryKey],
      dateRule: {
        type: 'fixed_day',
        day,
        businessDayNumber: null,
        toleranceDays: null,
        nonBusinessDayShift: 'none',
      },
      maxPayments: 1,
      startsMonth,
      pausedAt: seed.endedDaysAgo ? toInstant(addDays(TODAY, -seed.endedDaysAgo)) : null,
      archivedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    database.recurrences.push(recurrence);
    created.push({ seed, recurrence });

    for (const month of [addMonths(CURRENT_MONTH, -3), addMonths(CURRENT_MONTH, -2)]) {
      occurrenceOf(recurrence, month).settledAt = toInstant(dateInMonth(month, 28));
    }
    link(
      occurrenceOf(recurrence, previous),
      charge(seed.description, seed.categoryKey, dateInMonth(previous, day), seed.expectedCents),
    );
  }

  ensureOccurrences(database);

  for (const { seed, recurrence } of created) {
    if (seed.thisMonthCents === null) continue;
    const tx = charge(
      seed.description,
      seed.categoryKey,
      dateInMonth(CURRENT_MONTH, Math.max(1, today - seed.daysAgo)),
      seed.thisMonthCents,
    );
    const occurrence = database.occurrences.find(
      (item) => item.recurrenceId === recurrence.id && item.month === CURRENT_MONTH,
    );
    // An ended subscription has no occurrence this month: the charge is the surprise.
    if (occurrence) link(occurrence, tx);
  }

  for (const purchase of REPEATED_PURCHASES) {
    const day = Math.max(1, today - purchase.daysAgo);
    purchase.amounts.forEach((amountCents, index) => {
      const month = addMonths(CURRENT_MONTH, index - (purchase.amounts.length - 1));
      charge(purchase.description, purchase.categoryKey, dateInMonth(month, day), amountCents);
    });
  }
}
