import type { Invoice as InvoiceContract } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { buildInvoiceItems } from '#/modules/invoices/application/invoice/build-invoice-items.util.ts';
import type { CardInvoiceTransactionReader } from '#/modules/invoices/application/invoice/card-invoice-transaction-reader.interface.ts';
import { computeCategoryBreakdown } from '#/modules/invoices/application/invoice/compute-category-breakdown.util.ts';
import { computeInvoiceHighlights } from '#/modules/invoices/application/invoice/compute-invoice-highlights.util.ts';
import type { RecurrenceExpectationReader } from '#/modules/invoices/application/invoice/recurrence-expectation-reader.interface.ts';
import { computeSettledAmount } from '#/modules/invoices/application/invoice-payment/compute-settled-amount.util.ts';
import type { InvoicePaymentCandidateReader } from '#/modules/invoices/application/invoice-payment/invoice-payment-candidate-reader.interface.ts';
import type { PaymentTransactionReader } from '#/modules/invoices/application/invoice-payment/payment-transaction-reader.interface.ts';
import { computeInvoicePhase } from '#/modules/invoices/domain/invoice/compute-invoice-phase.util.ts';
import type { Invoice } from '#/modules/invoices/domain/invoice/invoice.entity.ts';
import { InvoiceStatement } from '#/modules/invoices/domain/invoice/invoice-statement.value-object.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import { findPaymentSuggestion } from '#/modules/invoices/domain/invoice-payment/find-payment-suggestion.util.ts';
import type { PaymentCandidate } from '#/modules/invoices/domain/invoice-payment/find-payment-suggestion.util.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const DAYS_AFTER_DUE_FOR_PAYMENT = 5;
const STATUSES_THAT_LOOK_FOR_PAYMENT: InvoiceContract.Status[] = ['closed', 'partial', 'overdue'];

// Builds the `Invoice.Dto` of the contract. A month with no row is a calculated invoice (the
// cycle dates of the card today, nothing written); a month with a row keeps the dates it was born
// with. The sums of the cycle, the payments' transactions and the payment found come from the
// owners through their ports, and the rules (total, state, remaining) from `InvoiceStatement`, so
// the list, the detail and the changes answer the same thing.
export class InvoiceDtoBuilder {
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly cardTransactions: CardInvoiceTransactionReader;
  private readonly paymentTransactions: PaymentTransactionReader;
  private readonly paymentCandidates: InvoicePaymentCandidateReader;
  private readonly expectations: RecurrenceExpectationReader | undefined;
  private readonly calendar: BusinessCalendar;
  private readonly clock: Clock;

  constructor(
    invoices: InvoiceRepository<Kysely<Database>>,
    cardTransactions: CardInvoiceTransactionReader,
    paymentTransactions: PaymentTransactionReader,
    paymentCandidates: InvoicePaymentCandidateReader,
    expectations: RecurrenceExpectationReader | undefined,
    calendar: BusinessCalendar,
    clock: Clock,
  ) {
    this.invoices = invoices;
    this.cardTransactions = cardTransactions;
    this.paymentTransactions = paymentTransactions;
    this.paymentCandidates = paymentCandidates;
    this.expectations = expectations;
    this.calendar = calendar;
    this.clock = clock;
  }

  // The invoice of the month that is open today for this card: the one a purchase of today falls in.
  openMonthOf(card: CardReader.Card): Month {
    return new InvoiceCycle(card.closingDay, card.dueDay).monthFor(this.clock.today());
  }

  async buildMany(
    card: CardReader.Card,
    months: Month[],
    executor?: Kysely<Database>,
  ): Promise<InvoiceContract.Dto[]> {
    const assembled = await this.assemble(card, months, true, executor);

    return assembled.map((invoice) => invoice.dto);
  }

  // The oldest of the months (given oldest first) that is closed, partial or overdue: the invoice
  // still to pay that comes first (BR-DSH-009). Null when none is waiting.
  async findOldestUnpaidMonth(
    card: CardReader.Card,
    months: Month[],
    executor?: Kysely<Database>,
  ): Promise<Month | null> {
    const assembled = await this.assemble(card, months, false, executor);
    const found = assembled.find((invoice) =>
      STATUSES_THAT_LOOK_FOR_PAYMENT.includes(invoice.dto.status),
    );

    return found ? Month.of(found.dto.month) : null;
  }

  async buildDetail(
    card: CardReader.Card,
    month: Month,
    executor?: Kysely<Database>,
  ): Promise<InvoiceContract.DetailDto> {
    const [[current], neighbours, items] = await Promise.all([
      this.assemble(card, [month], true, executor),
      this.assemble(card, [month.previous(), month.next()], false, executor),
      this.cardTransactions.itemsOf(card.id, month, executor),
    ]);
    const [previous, next] = neighbours;
    if (!current || !previous || !next) throw new RangeError('The months asked were not built');

    return {
      ...current.dto,
      items: buildInvoiceItems(items, current.expectations),
      categoryBreakdown: computeCategoryBreakdown(items),
      previousTotalCents: previous.hasActivity ? previous.dto.totalCents : null,
      highlights: computeInvoiceHighlights(items),
      // What the next invoice already has: its installments and the recurrences foreseen for it.
      nextInvoiceCommittedCents: Math.max(
        0,
        next.dto.breakdown.installmentsCents + next.dto.breakdown.expectedRecurringCents,
      ),
    };
  }

  private async assemble(
    card: CardReader.Card,
    months: Month[],
    withSuggestions: boolean,
    executor?: Kysely<Database>,
  ): Promise<InvoiceDtoBuilder.InProgress[]> {
    const today = this.clock.today();
    const cycle = new InvoiceCycle(card.closingDay, card.dueDay);
    const openMonth = cycle.monthFor(today);
    const phaseOf = (month: Month) => computeInvoicePhase(month, openMonth);

    const [rows, totals, expected] = await Promise.all([
      this.invoices.findByAccountAndMonths(card.id, months, executor),
      this.cardTransactions.totalsByMonth(card.id, months, executor),
      this.expectedByMonth(
        card.id,
        months.filter((month) => phaseOf(month) !== 'past'),
        executor,
      ),
    ]);
    const rowByMonth = new Map(rows.map((row) => [row.month.value, row]));
    const transactionIds = rows.flatMap((row) =>
      row.payments.flatMap((payment) => payment.transactionId ?? []),
    );
    const snapshots =
      transactionIds.length > 0
        ? await this.paymentTransactions.findMany(transactionIds, executor)
        : new Map<string, PaymentTransactionReader.Snapshot>();

    const assembled: InvoiceDtoBuilder.InProgress[] = [];
    for (const month of months) {
      const row = rowByMonth.get(month.value);
      const sums = totals.get(month.value);
      const phase = phaseOf(month);
      const closesOn = row?.closesOn ?? cycle.closesOn(month);
      const dueOn = row?.dueOn ?? cycle.dueOn(month, this.calendar);
      const payments = row?.payments ?? [];
      const expectations = expected.get(month.value) ?? [];

      const statement = InvoiceStatement.compute({
        phase,
        today,
        closesOn,
        dueOn,
        purchases: Money.fromCents(sums?.purchasesCents ?? 0),
        installments: Money.fromCents(sums?.installmentsCents ?? 0),
        expectedRecurring: Money.fromCents(
          expectations.reduce((sum, item) => sum + item.amountCents, 0),
        ),
        bankTotal: row?.bankTotal ?? null,
        totalOverride: row?.totalOverride ?? null,
        paid: computeSettledAmount(payments, snapshots),
      });

      const suggestion =
        withSuggestions &&
        STATUSES_THAT_LOOK_FOR_PAYMENT.includes(statement.status) &&
        statement.unpaid().cents > 0
          ? await this.findSuggestion(card.id, row, statement, closesOn, dueOn, executor)
          : null;
      const presumed =
        suggestion?.isPresumed === true
          ? Money.fromCents(Math.abs(suggestion.transaction.amount.cents))
          : Money.zero();

      assembled.push({
        expectations,
        hasActivity: row !== undefined || (sums?.transactionCount ?? 0) > 0,
        dto: {
          accountId: card.id,
          month: month.value,
          closesOn: closesOn.value,
          dueOn: dueOn.value,
          status: statement.status,
          breakdown: {
            purchasesCents: statement.purchases.cents,
            installmentsCents: statement.installments.cents,
            expectedRecurringCents: statement.expectedRecurring.cents,
          },
          computedTotalCents: statement.computedTotal.cents,
          bankTotalCents: row?.bankTotal?.cents ?? null,
          totalOverrideCents: row?.totalOverride?.cents ?? null,
          overrideNote: row?.overrideNote ?? null,
          totalCents: statement.total.cents,
          paidCents: statement.paid.cents,
          presumedPaidCents: presumed.cents,
          remainingCents: statement.remaining(presumed).cents,
          payments: payments
            .toSorted(
              (a, b) =>
                a.paidOn.value.localeCompare(b.paidOn.value) ||
                a.createdAt.localeCompare(b.createdAt) ||
                a.id.localeCompare(b.id),
            )
            .map((payment) => ({
              id: payment.id,
              amountCents: payment.amount.cents,
              paidOn: payment.paidOn.value,
              transactionId: payment.transactionId,
            })),
          paymentSuggestion: suggestion
            ? {
                transactionId: suggestion.transaction.transactionId,
                accountId: suggestion.transaction.accountId,
                amountCents: suggestion.transaction.amount.cents,
                occurredOn: suggestion.transaction.occurredOn.value,
                description: suggestion.transaction.description,
                isPresumed: suggestion.isPresumed,
              }
            : null,
          isEditable: statement.status !== 'projected',
        },
      });
    }

    return assembled;
  }

  private async expectedByMonth(
    accountId: string,
    months: Month[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, RecurrenceExpectationReader.Expectation[]>> {
    if (!this.expectations || months.length === 0) return new Map();

    return this.expectations.expectationsOf(accountId, months, executor);
  }

  // The "Pagamento encontrado": the debits the detectors marked, minus the ones already tied to an
  // invoice or dismissed for this one.
  private async findSuggestion(
    cardAccountId: string,
    row: Invoice | undefined,
    statement: InvoiceStatement,
    closesOn: BusinessDate,
    dueOn: BusinessDate,
    executor?: Kysely<Database>,
  ) {
    const found = await this.paymentCandidates.candidatesFor(
      {
        cardAccountId,
        from: closesOn.value,
        to: dueOn.addDays(DAYS_AFTER_DUE_FOR_PAYMENT).value,
      },
      executor,
    );
    const linked = await this.invoices.findLinkedTransactionIds(
      found.debits.map((debit) => debit.transactionId),
      executor,
    );
    const toDomain = (candidate: InvoicePaymentCandidateReader.Candidate): PaymentCandidate => ({
      transactionId: candidate.transactionId,
      accountId: candidate.accountId,
      amount: Money.fromCents(candidate.amountCents),
      occurredOn: BusinessDate.of(candidate.occurredOn),
      description: candidate.description,
    });

    return findPaymentSuggestion({
      debits: found.debits.map(toDomain),
      credits: found.credits.map(toDomain),
      lacking: statement.unpaid(),
      closesOn,
      dueOn,
      excludedTransactionIds: new Set([...linked, ...(row?.dismissedTransactionIds ?? [])]),
    });
  }
}

export namespace InvoiceDtoBuilder {
  export type InProgress = {
    // What is still expected on the invoice (none once its month is past).
    expectations: RecurrenceExpectationReader.Expectation[];
    // The row exists or a transaction falls in it: the month is not empty.
    hasActivity: boolean;
    dto: InvoiceContract.Dto;
  };
}
