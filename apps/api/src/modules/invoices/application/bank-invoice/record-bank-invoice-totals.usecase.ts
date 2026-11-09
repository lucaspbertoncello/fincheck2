import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import type { InvoiceOpener } from '#/modules/invoices/application/invoice/invoice-opener.service.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The invoices the bank closed (the sync, `listInvoices` of the provider): each one names its due
// date and its total, and the total becomes the `bankTotal` of the invoice of the card whose cycle
// has that due date (never a correction of Lucas, who keeps `totalOverride`). The row of the invoice
// is born here when it did not exist (it keeps the cycle dates of the card today). A bill whose due
// date fits no month of the cycle is left out, and so is an archived card or one that is not a card:
// a guess would put the total on the wrong invoice. Runs inside the unit of work of the round, with
// its executor.
export class RecordBankInvoiceTotalsUseCase {
  private readonly cards: CardReader;
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly opener: InvoiceOpener;
  private readonly calendar: BusinessCalendar;
  private readonly clock: Clock;

  constructor(
    cards: CardReader,
    invoices: InvoiceRepository<Kysely<Database>>,
    opener: InvoiceOpener,
    calendar: BusinessCalendar,
    clock: Clock,
  ) {
    this.cards = cards;
    this.invoices = invoices;
    this.opener = opener;
    this.calendar = calendar;
    this.clock = clock;
  }

  async execute(
    input: RecordBankInvoiceTotalsUseCase.Input,
    executor: Kysely<Database>,
  ): Promise<RecordBankInvoiceTotalsUseCase.Output> {
    const card = await this.cards.findCard(input.accountId, executor);
    if (!card || card.isArchived) return { recordedCount: 0 };

    const now = this.clock.now();
    const cycle = new InvoiceCycle(card.closingDay, card.dueDay);
    let recordedCount = 0;

    for (const bill of input.bills) {
      const month = cycle.monthDueOn(BusinessDate.of(bill.dueOn), this.calendar);
      if (month === null) continue;

      const invoice = await this.opener.loadOrOpen(card, month, now, executor);
      if (!invoice.registerBankTotal(Money.fromCents(bill.totalCents), now)) continue;
      await this.invoices.save(invoice, executor);
      recordedCount += 1;
    }

    return { recordedCount };
  }
}

export namespace RecordBankInvoiceTotalsUseCase {
  export type Input = {
    accountId: string;
    // The invoices the bank closed: due date and total (never negative).
    bills: { dueOn: string; totalCents: number }[];
  };

  export type Output = { recordedCount: number };
}
