import type { MonthSummary } from '@fincheck/shared/dashboard/month-summary/month-summary.type.ts';

import type { AgendaLoader } from '#/modules/dashboard/application/agenda/agenda-loader.service.ts';
import type { AgendaOccurrenceReader } from '#/modules/dashboard/application/occurrence/agenda-occurrence-reader.interface.ts';
import type { ConnectionReader } from '#/modules/dashboard/application/connection/connection-reader.interface.ts';
import type { SpendingLineReader } from '#/modules/dashboard/application/spending-line/spending-line-reader.interface.ts';
import { computeFreeBalance } from '#/modules/dashboard/domain/free-balance/compute-free-balance.util.ts';
import { isConnectionStale } from '#/modules/dashboard/domain/free-balance/is-connection-stale.util.ts';
import { computeComparisonWindow } from '#/modules/dashboard/domain/month-comparison/compute-comparison-window.util.ts';
import { roundPct } from '#/modules/dashboard/domain/month-comparison/round-pct.util.ts';
import { buildMonthAlerts } from '#/modules/dashboard/domain/month-summary/build-month-alerts.util.ts';
import { computeIncomeExpectation } from '#/modules/dashboard/domain/month-summary/compute-income-expectation.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The three cards of the Visão geral and the line "Faltam N dias" (BR-DSH-004, 011, 012; BR-REC-013;
// RF-DSH-003, 010): Receitas (received of expected), Despesas (spent, against the same point of the
// month before) and Resultado do mês (received - spent). Spending is by competence (BR-DSH-001).
// What is left for the month (`remaining`) is the same as the composition of the Livre, only in the
// current month. The controller creates the missing occurrences first.
export class GetMonthSummaryQuery {
  private readonly loader: AgendaLoader;
  private readonly occurrences: AgendaOccurrenceReader;
  private readonly lines: SpendingLineReader;
  private readonly connections: ConnectionReader | undefined;
  private readonly clock: Clock;

  constructor(
    loader: AgendaLoader,
    occurrences: AgendaOccurrenceReader,
    lines: SpendingLineReader,
    connections: ConnectionReader | undefined,
    clock: Clock,
  ) {
    this.loader = loader;
    this.occurrences = occurrences;
    this.lines = lines;
    this.connections = connections;
    this.clock = clock;
  }

  async execute(input: GetMonthSummaryQuery.Input): Promise<GetMonthSummaryQuery.Output> {
    const month = Month.of(input.month);
    assertSupportedMonth(month, 'month');
    const today = this.clock.today();
    const window = computeComparisonWindow(month, today);

    // Only the current month has "what is left" (the Livre), which needs every owner; another month
    // needs only its occurrences.
    const [snapshot, occurrences, lines, connections] = await Promise.all([
      window.isCurrentMonth
        ? this.loader.load({ month, withSettled: false })
        : Promise.resolve(null),
      window.isCurrentMonth ? Promise.resolve(null) : this.occurrences.listOfMonth(month.value),
      this.lines.listLines({ from: window.previousFromOn.value, to: month.lastDay().value }),
      this.connections?.listConnections() ?? Promise.resolve([]),
    ]);

    const within = (on: string, from: string, until: string) => on >= from && on <= until;
    const sumIn = (kind: 'expense' | 'income', from: string, until: string) =>
      lines
        .filter((line) => line.kind === kind && within(line.on, from, until))
        // Spending is `-amount`; written as a subtraction so a sum of zero stays a plain 0.
        .reduce(
          (total, line) =>
            kind === 'expense' ? total - line.amountCents : total + line.amountCents,
          0,
        );
    const [from, asOf] = [window.fromOn.value, window.asOfOn.value];
    const [previousFrom, previousUntil] = [
      window.previousFromOn.value,
      window.previousUntilOn.value,
    ];

    const spent = sumIn('expense', from, asOf);
    const previousSpent = sumIn('expense', previousFrom, previousUntil);
    const received = sumIn('income', from, asOf);
    const previousReceived = sumIn('income', previousFrom, previousUntil);

    // The expectation: the income occurrences of the month (not the ones that came along from an
    // earlier month, not the skipped) and the income of the month that none of them took in.
    const ofMonth = snapshot?.occurrences ?? occurrences ?? [];
    const expectation = computeIncomeExpectation({
      occurrences: ofMonth
        .filter(
          (occurrence) =>
            occurrence.kind === 'income' &&
            occurrence.status !== 'skipped' &&
            !occurrence.carriedOver,
        )
        .map((occurrence) => ({
          expectedCents: occurrence.expectedAmountCents,
          receivedCents: occurrence.receivedCents,
          categoryId: occurrence.categoryId,
          paymentTransactionIds: occurrence.payments.map((payment) => payment.transactionId),
        })),
      monthIncome: lines
        .filter(
          (line) =>
            line.kind === 'income' &&
            within(line.on, month.firstDay().value, month.lastDay().value),
        )
        .map((line) => ({
          transactionId: line.transactionId,
          cents: line.amountCents,
          categoryId: line.categoryId,
        })),
    });

    let remaining: MonthSummary.Dto['remaining'] = null;
    if (snapshot) {
      const livre = computeFreeBalance({
        accountsTotal: Money.zero(),
        entries: snapshot.entries,
        today,
      });
      remaining = {
        daysRemaining: livre.daysRemaining,
        incomingCents: livre.receivableTotal.cents,
        outgoingCents: livre.payableTotal.cents,
      };
    }

    const now = this.clock.now();

    return {
      month: month.value,
      isCurrentMonth: window.isCurrentMonth,
      asOfOn: asOf,
      remaining,
      income: {
        receivedCents: received,
        expectedCents: expectation.totalCents,
        receivedPct: roundPct(received, expectation.totalCents),
      },
      expenses: {
        spentCents: spent,
        previousSpentCents: previousSpent,
        changeCents: spent - previousSpent,
        changePct: roundPct(spent - previousSpent, previousSpent),
        comparedFromOn: from,
        comparedUntilOn: asOf,
        previousComparedUntilOn: previousUntil,
      },
      result: { cents: received - spent, previousCents: previousReceived - previousSpent },
      alerts: buildMonthAlerts({
        isCurrentMonth: window.isCurrentMonth,
        today,
        connections: connections.map((connection) => ({
          connectionId: connection.connectionId,
          institutionName: connection.institutionName,
          status: connection.status,
          isStale: isConnectionStale(connection.lastBankUpdateAt, now),
        })),
        occurrences: ofMonth,
      }),
    };
  }
}

export namespace GetMonthSummaryQuery {
  export type Input = { month: string };
  export type Output = MonthSummary.Dto;
}
