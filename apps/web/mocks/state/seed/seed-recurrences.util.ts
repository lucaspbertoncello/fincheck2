import { computeOccurrenceWindow } from '#mocks/recurrences/occurrence/compute-occurrence-window.util.ts';
import { ensureOccurrences } from '#mocks/recurrences/occurrence/ensure-occurrences.util.ts';
import { newId } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import type { SeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { invoiceMonthFor } from '#mocks/invoices/invoice/invoice-month-for.util.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { dateInMonth } from '#mocks/support/dates/date-in-month.util.ts';
import { dayOf } from '#mocks/support/dates/day-of.util.ts';
import { nthBusinessDay } from '#mocks/support/dates/nth-business-day.util.ts';
import { toInstant } from '#mocks/support/dates/to-instant.util.ts';

type DateRule = MockState.RecurrenceRecord['dateRule'];

const rule = (type: DateRule['type'], extra: Partial<DateRule> = {}): DateRule => ({
  type,
  day: null,
  businessDayNumber: null,
  toleranceDays: null,
  nonBusinessDayShift: type === 'fixed_day' ? 'none' : null,
  ...extra,
});

// The recurrences of the user's real income and fixed expenses (names and amounts made up), their
// history and the payments already matched this month.
export function seedRecurrences(database: MockState.Database, ids: SeedIds): void {
  const { acc, cat, rec } = ids;
  const today = dayOf(TODAY);
  const previous = addMonths(CURRENT_MONTH, -1);
  const startsMonth = addMonths(CURRENT_MONTH, -3);
  const createdAt = toInstant(`${startsMonth}-01`);

  const base = {
    amountMode: 'fixed' as const,
    counterparty: null,
    matchText: null,
    employmentRegime: null,
    maxPayments: 1,
    startsMonth,
    pausedAt: null,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
  };

  database.recurrences.push(
    {
      ...base,
      id: rec.salarioDia5,
      kind: 'income',
      employmentRegime: 'clt' as const,
      name: 'Salário Alvorada, 5º dia útil',
      expectedAmountCents: 123_000,
      counterparty: 'Alvorada Sistemas',
      matchText: 'ALVORADA SISTEMAS',
      accountId: acc.nuConta,
      method: 'transfer',
      categoryId: cat.salario,
      dateRule: rule('business_day', { businessDayNumber: 5 }),
    },
    {
      ...base,
      id: rec.salarioDia15,
      kind: 'income',
      employmentRegime: 'clt' as const,
      name: 'Salário Alvorada, dia 15',
      expectedAmountCents: 137_000,
      counterparty: 'Alvorada Sistemas',
      matchText: 'ALVORADA SISTEMAS',
      accountId: acc.nuConta,
      method: 'transfer',
      categoryId: cat.salario,
      dateRule: rule('fixed_day', { day: 15 }),
    },
    {
      ...base,
      id: rec.freela,
      kind: 'income',
      employmentRegime: 'pj' as const,
      name: 'Lume Design (freela)',
      expectedAmountCents: 395_000,
      counterparty: 'Pix de M. Souza, conta PJ',
      matchText: 'M SOUZA',
      accountId: acc.nuConta,
      method: 'pix',
      categoryId: cat.freelance,
      dateRule: rule('around_day', { day: 25, toleranceDays: 2 }),
    },
    {
      ...base,
      id: rec.mesada,
      kind: 'income',
      employmentRegime: 'other' as const,
      name: 'Mesada',
      expectedAmountCents: 80_000,
      counterparty: 'Pix do Jorge',
      matchText: 'JORGE A LIMA',
      maxPayments: 2,
      accountId: acc.nuConta,
      method: 'pix',
      categoryId: cat.mesada,
      dateRule: rule('any_day'),
    },
    {
      ...base,
      id: rec.vr,
      kind: 'income',
      employmentRegime: 'other' as const,
      name: 'VR convertido',
      expectedAmountCents: 74_000,
      counterparty: 'Pix do Jorge',
      matchText: 'JORGE A LIMA',
      accountId: acc.nuConta,
      method: 'pix',
      categoryId: cat.beneficio,
      dateRule: rule('any_day', { day: 5 }),
    },
    {
      ...base,
      id: rec.academia,
      kind: 'expense',
      name: 'Academia',
      expectedAmountCents: 10_990,
      matchText: 'ACADEMIA FORMA',
      accountId: acc.brConta,
      method: 'debit',
      categoryId: cat.saude,
      dateRule: rule('fixed_day', { day: Math.max(1, today - 9) }),
    },
    {
      ...base,
      id: rec.internet,
      kind: 'expense',
      name: 'Internet',
      expectedAmountCents: 11_990,
      matchText: 'FIBRANET',
      accountId: acc.brConta,
      method: 'boleto',
      categoryId: cat.moradia,
      dateRule: rule('fixed_day', { day: Math.max(1, today - 5) }),
    },
    {
      ...base,
      id: rec.diarista,
      kind: 'expense',
      name: 'Diarista',
      expectedAmountCents: 28_000,
      matchText: 'MARIA DAS GRACAS',
      accountId: acc.nuConta,
      method: 'pix',
      categoryId: cat.moradia,
      dateRule: rule('around_day', { day: Math.max(1, today - 6), toleranceDays: 2 }),
    },
    {
      ...base,
      id: rec.streaming,
      kind: 'expense',
      name: 'Streamflix',
      expectedAmountCents: 4490,
      matchText: 'STREAMFLIX',
      accountId: acc.nuCartao,
      method: 'credit',
      categoryId: cat.assinaturas,
      dateRule: rule('fixed_day', { day: Math.max(1, today - 3) }),
    },
    {
      ...base,
      id: rec.celular,
      kind: 'expense',
      name: 'Plano celular',
      expectedAmountCents: 5499,
      matchText: 'TELECEL',
      accountId: acc.nuCartao,
      method: 'credit',
      categoryId: cat.assinaturas,
      dateRule: rule('fixed_day', { day: Math.min(28, today + 3) }),
    },
  );

  const nuCard = database.accounts.find((a) => a.id === acc.nuCartao)?.creditCard;

  // History: two older months marked by hand, last month matched with real transactions.
  const addOccurrence = (recurrence: MockState.RecurrenceRecord, month: string) => {
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
  const pay = (
    occurrence: MockState.OccurrenceRecord,
    recurrence: MockState.RecurrenceRecord,
    occurredOn: string,
    amountCents: number,
    description: string,
    counterparty: string | null,
  ) => {
    const expense = recurrence.kind === 'expense';
    const tx = makeTransactionRecord({
      accountId: recurrence.accountId ?? acc.nuConta,
      method: recurrence.method ?? 'pix',
      description,
      amountCents: expense ? -amountCents : amountCents,
      occurredOn,
      counterparty,
      categoryId: recurrence.categoryId,
      categorySource: 'recurrence',
      invoiceMonth:
        recurrence.method === 'credit' && nuCard
          ? invoiceMonthFor(nuCard.closingDay, occurredOn)
          : null,
    });
    database.transactions.push(tx);
    occurrence.payments.push({
      id: newId(),
      transactionId: tx.id,
      amountCents,
      occurredOn,
      linkedBy: 'auto',
    });
  };

  for (const recurrence of database.recurrences) {
    for (const month of [addMonths(CURRENT_MONTH, -3), addMonths(CURRENT_MONTH, -2)]) {
      addOccurrence(recurrence, month).settledAt = toInstant(dateInMonth(month, 28));
    }
    const lastMonth = addOccurrence(recurrence, previous);
    const expectedOn = lastMonth.expectedOn ?? dateInMonth(previous, 4);
    const sender = recurrence.counterparty;
    if (recurrence.id === rec.mesada) {
      pay(
        lastMonth,
        recurrence,
        dateInMonth(previous, 4),
        40_000,
        'PIX JORGE A LIMA',
        'JORGE A LIMA',
      );
      pay(
        lastMonth,
        recurrence,
        dateInMonth(previous, 18),
        40_000,
        'PIX JORGE A LIMA',
        'JORGE A LIMA',
      );
    } else if (recurrence.id === rec.vr) {
      pay(
        lastMonth,
        recurrence,
        dateInMonth(previous, 3),
        74_000,
        'PIX JORGE A LIMA',
        'JORGE A LIMA',
      );
    } else if (recurrence.id === rec.freela) {
      pay(lastMonth, recurrence, dateInMonth(previous, 26), 395_000, 'PIX M SOUZA', 'M SOUZA');
    } else if (recurrence.kind === 'income') {
      pay(
        lastMonth,
        recurrence,
        expectedOn,
        recurrence.expectedAmountCents,
        'TED ALVORADA SISTEMAS',
        sender,
      );
    } else {
      pay(
        lastMonth,
        recurrence,
        expectedOn,
        recurrence.expectedAmountCents,
        recurrence.name.toUpperCase(),
        null,
      );
    }
  }

  // This month: what already happened, tied to the occurrence the way the automatic match would.
  ensureOccurrences(database);
  const current = (id: string) => {
    const recurrence = database.recurrences.find((item) => item.id === id);
    const occurrence = database.occurrences.find(
      (item) => item.recurrenceId === id && item.month === CURRENT_MONTH,
    );
    if (!recurrence || !occurrence) throw new Error('Seed: occurrence missing');

    return { recurrence, occurrence };
  };

  const dayFive = current(rec.salarioDia5);
  const dayFiveOn = nthBusinessDay(CURRENT_MONTH, 5);
  if (dayFiveOn <= TODAY)
    pay(
      dayFive.occurrence,
      dayFive.recurrence,
      dayFiveOn,
      123_000,
      'TED ALVORADA SISTEMAS',
      'ALVORADA SISTEMAS',
    );

  const dayFifteen = current(rec.salarioDia15);
  const dayFifteenOn = dateInMonth(CURRENT_MONTH, 15);
  if (dayFifteenOn <= TODAY)
    pay(
      dayFifteen.occurrence,
      dayFifteen.recurrence,
      dayFifteenOn,
      137_000,
      'TED ALVORADA SISTEMAS',
      'ALVORADA SISTEMAS',
    );

  const mesada = current(rec.mesada);
  pay(
    mesada.occurrence,
    mesada.recurrence,
    dateInMonth(CURRENT_MONTH, Math.min(3, today)),
    40_000,
    'PIX JORGE A LIMA',
    'JORGE A LIMA',
  );
  const vr = current(rec.vr);
  pay(
    vr.occurrence,
    vr.recurrence,
    dateInMonth(CURRENT_MONTH, Math.min(2, today)),
    74_000,
    'PIX JORGE A LIMA',
    'JORGE A LIMA',
  );

  const academia = current(rec.academia);
  pay(
    academia.occurrence,
    academia.recurrence,
    academia.occurrence.expectedOn ?? TODAY,
    10_990,
    'ACADEMIA FORMA FISICA',
    null,
  );
  // The internet came R$ 10,00 higher than expected: a different value waiting for an answer.
  const internet = current(rec.internet);
  pay(
    internet.occurrence,
    internet.recurrence,
    internet.occurrence.expectedOn ?? TODAY,
    12_990,
    'FIBRANET TELECOM',
    null,
  );
  const streaming = current(rec.streaming);
  pay(
    streaming.occurrence,
    streaming.recurrence,
    streaming.occurrence.expectedOn ?? TODAY,
    4490,
    'STREAMFLIX',
    null,
  );
  // Diarista (late) and Plano celular (still to come, inside the Nubank invoice) have no payment.
  // Freela has none yet: it comes by Pix from a third party around day 25.
}
