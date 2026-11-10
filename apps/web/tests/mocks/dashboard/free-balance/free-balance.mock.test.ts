import { agendaDtoSchema } from '@fincheck/shared/dashboard/agenda/agenda.schema.ts';
import { categoryBreakdownDtoSchema } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import { freeBalanceDtoSchema } from '@fincheck/shared/dashboard/free-balance/free-balance.schema.ts';
import { monthSummaryDtoSchema } from '@fincheck/shared/dashboard/month-summary/month-summary.schema.ts';
import { spendingCurveDtoSchema } from '@fincheck/shared/dashboard/spending-curve/spending-curve.schema.ts';
import { timelineDtoSchema } from '@fincheck/shared/dashboard/timeline/timeline.schema.ts';
import { recurrenceSummarySchema } from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { transactionSummaryDtoSchema } from '@fincheck/shared/transactions/transaction-summary/transaction-summary.schema.ts';
import { describe, expect, it } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function freeBalance() {
  return freeBalanceDtoSchema.parse((await callApi('GET', '/dashboard/free-balance')).json);
}

async function agenda() {
  return agendaDtoSchema.parse((await callApi('GET', `/agenda?month=${CURRENT_MONTH}`)).json);
}

describe('dashboard routes', () => {
  it('computes the Livre as accounts + to receive - to pay, and the per-day value', async () => {
    const free = await freeBalance();
    expect(free.freeBalanceCents).toBe(
      free.accounts.totalCents + free.receivable.totalCents - free.payable.totalCents,
    );
    expect(free.perDayCents).toBe(Math.floor(free.freeBalanceCents / free.daysRemaining + 0.5));
    expect(free.isPartial).toBe(false);
    expect(free.accounts.items.map((item) => item.name).sort()).toEqual([
      'Bradesco',
      'Carteira',
      'Nubank',
    ]);
    expect(free.dataFreshness.some((item) => item.isStale)).toBe(true);
    expect(free.review.count).toBeGreaterThanOrEqual(4);
    expect(free.review.byAccount.reduce((sum, item) => sum + item.count, 0)).toBe(
      free.review.count,
    );
  });

  it('does not count twice what was paid but not tied yet, nor what is owed by a friend', async () => {
    const free = await freeBalance();
    // The closed Bradesco invoice was paid (found, not tied): only its open successor counts.
    const closedInvoices = free.payable.items.filter(
      (item) => item.source.type === 'invoice' && item.invoiceState === 'closed',
    );
    expect(closedInvoices).toEqual([]);
    expect(free.payable.items.some((item) => item.title === 'Mensalidade do curso')).toBe(false);
    expect(free.receivable.items.some((item) => item.badge === 'friend_receivable')).toBe(false);
    expect(free.payable.items.some((item) => item.title === 'Fatura Roxinho')).toBe(true);
    expect(
      free.payable.items.every((item) => item.remainingCents > 0 && item.countsInFreeBalance),
    ).toBe(true);
  });

  it('shows "pago, falta vincular" in the agenda and keeps the payable total equal to the Livre', async () => {
    const [free, view] = [await freeBalance(), await agenda()];
    expect(view.payable.totalCents).toBe(free.payable.totalCents);
    const course = view.thisMonth.find((item) => item.title === 'Mensalidade do curso');
    expect(course).toMatchObject({ presumedPaidCents: 18_000, remainingCents: 0 });
    expect(course?.presumedTransactionId).not.toBeNull();
    const bradesco = view.openInvoices.find((item) => item.title === 'Fatura Bradesco Black');
    expect(bradesco?.paymentFound).not.toBeNull();
    expect(bradesco?.paymentFound?.description).toEqual(expect.any(String));
    expect(bradesco?.invoiceState).toBe('closed');
    // Júlia owes R$ 58,00 more, and the Pix that paid it is found and not linked: the agenda
    // counts it as received (the Amigos tab, which reads what is registered, still shows R$ 58,00).
    const julia = view.receivable.find((item) => item.counterparty === 'Júlia');
    expect(julia).toMatchObject({ presumedPaidCents: 5800, remainingCents: 0 });
    expect(julia?.presumedTransactionId).not.toBeNull();
    expect(view.friendsReceivable).toMatchObject({ peopleCount: 1, totalCents: 0 });
    expect(view.undated.map((item) => item.title)).toEqual(['Conserto do notebook']);
    expect(view.settled.some((item) => item.title === 'Seguro do celular')).toBe(true);
  });

  it('titles a friend debt by the direction: "Você deve a <nome>" and "<nome> te deve"', async () => {
    const view = await agenda();
    const titles = [
      ...view.thisMonth,
      ...view.openInvoices,
      ...view.receivable,
      ...view.undated,
      ...view.settled,
    ]
      .filter((item) => item.badge === 'debt' || item.badge === 'friend_receivable')
      .map((item) => item.title);
    expect(titles).toContain('Você deve a Rafa');
    expect(titles.every((title) => /^Você deve a |^.+ te deve$/.test(title))).toBe(true);
  });

  it('sums the expected income of every income occurrence of the month, skipped ones out', async () => {
    const summary = monthSummaryDtoSchema.parse(
      (await callApi('GET', `/dashboard/month-summary?month=${CURRENT_MONTH}`)).json,
    );
    const recurrences = recurrenceSummarySchema.parse(
      (await callApi('GET', `/recurrences/summary?month=${CURRENT_MONTH}`)).json,
    );
    // Plus the Pix of Júlia found and not linked yet: income of the month that no occurrence took in.
    expect(summary.income.expectedCents).toBe(recurrences.incomes.expectedCents + 5800);
  });

  it('moves the Livre when a bill is paid and when a transaction is created', async () => {
    const before = await freeBalance();
    const bill = (await agenda()).thisMonth.find((item) => item.title === 'IPVA, cota 2');
    await callApi('POST', `/bills/${bill?.source.billId}/payments`, {
      amountCents: 38_000,
      paidOn: before.asOfOn,
    });
    const afterBill = await freeBalance();
    expect(afterBill.payable.totalCents).toBe(before.payable.totalCents - 38_000);
    expect(afterBill.freeBalanceCents).toBe(before.freeBalanceCents + 38_000);

    const wallet = before.accounts.items.find((item) => item.name === 'Carteira');
    await callApi('POST', '/transactions', {
      type: 'expense',
      accountId: wallet?.accountId,
      method: 'cash',
      description: 'Lanche',
      amountCents: 1500,
      occurredOn: before.asOfOn,
    });
    expect((await freeBalance()).accounts.totalCents).toBe(before.accounts.totalCents - 1500);
  });

  it('serves the month summary, with the late freela alert only when it is late', async () => {
    const summary = monthSummaryDtoSchema.parse(
      (await callApi('GET', `/dashboard/month-summary?month=${CURRENT_MONTH}`)).json,
    );
    expect(summary.isCurrentMonth).toBe(true);
    expect(summary.remaining?.outgoingCents).toBe((await freeBalance()).payable.totalCents);
    expect(summary.income.expectedCents).toBeGreaterThanOrEqual(summary.income.receivedCents);
    expect(summary.result.cents).toBe(summary.income.receivedCents - summary.expenses.spentCents);
    expect(
      summary.alerts.some(
        (alert) => alert.type === 'stale_data' && alert.institutionName === 'Bradesco',
      ),
    ).toBe(true);

    const past = monthSummaryDtoSchema.parse(
      (await callApi('GET', '/dashboard/month-summary?month=2020-01')).json,
    );
    expect(past).toMatchObject({ isCurrentMonth: false, remaining: null });
  });

  it('agrees on spending between the curve, the summary and the breakdown by category', async () => {
    const transactions = transactionSummaryDtoSchema.parse(
      (await callApi('GET', `/transactions/summary?month=${CURRENT_MONTH}`)).json,
    );
    const curve = spendingCurveDtoSchema.parse(
      (await callApi('GET', `/dashboard/spending-curve?month=${CURRENT_MONTH}`)).json,
    );
    const breakdown = categoryBreakdownDtoSchema.parse(
      (await callApi('GET', `/dashboard/categories?month=${CURRENT_MONTH}`)).json,
    );

    const last = curve.days.filter((day) => day.currentCents !== null).at(-1);
    expect(breakdown.expenses.items.reduce((sum, item) => sum + item.spentCents, 0)).toBe(
      breakdown.expenses.totalCents,
    );
    expect(last?.currentCents).toBe(breakdown.expenses.totalCents);
    // The transactions summary counts the whole month, the dashboard until today.
    expect(transactions.expensesCents).toBeGreaterThanOrEqual(breakdown.expenses.totalCents);
    expect(breakdown.review.count).toBe(transactions.reviewCount);
    expect(breakdown.expenses.items.at(-1)?.categoryId).toBeNull();
    expect(breakdown.incomes.items.some((item) => item.pending.length > 0)).toBe(true);
  });

  it('builds the timeline: today onward with the projected balance ending at the Livre', async () => {
    const timeline = timelineDtoSchema.parse(
      (await callApi('GET', `/dashboard/timeline?month=${CURRENT_MONTH}`)).json,
    );
    expect(timeline.endBalanceCents).toBe((await freeBalance()).freeBalanceCents);
    const today = timeline.days.find((day) => day.isToday);
    expect(today?.projectedBalanceCents).not.toBeNull();
    expect(
      timeline.days.filter((day) => day.isPast).every((day) => day.projectedBalanceCents === null),
    ).toBe(true);
    expect(timeline.undated.map((item) => item.title)).toContain('Conserto do notebook');

    const recurrences = timelineDtoSchema.parse(
      (await callApi('GET', `/dashboard/timeline?month=${CURRENT_MONTH}&scope=recurrences`)).json,
    );
    const everything = [
      ...recurrences.overdue,
      ...recurrences.undated,
      ...recurrences.days.flatMap((day) => day.items),
    ];
    expect(everything.length).toBeGreaterThan(0);
    expect(everything.every((item) => item.source.type === 'occurrence')).toBe(true);
  });
});
