import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { Invoice } from '#/modules/invoices/domain/invoice/invoice.entity.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import type { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The invoice row to write on: the one that exists, or a new one with the cycle dates of the card
// today (the row is born on the first write; it is saved by whoever writes). Reads never call it.
export class InvoiceOpener {
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly calendar: BusinessCalendar;

  constructor(invoices: InvoiceRepository<Kysely<Database>>, calendar: BusinessCalendar) {
    this.invoices = invoices;
    this.calendar = calendar;
  }

  async loadOrOpen(
    card: CardReader.Card,
    month: Month,
    now: string,
    executor: Kysely<Database>,
  ): Promise<Invoice> {
    const existing = await this.invoices.findByAccountAndMonth(card.id, month, executor);
    if (existing) return existing;

    return Invoice.open(
      {
        accountId: card.id,
        month,
        cycle: new InvoiceCycle(card.closingDay, card.dueDay),
        calendar: this.calendar,
      },
      now,
    );
  }
}
