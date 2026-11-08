import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The month of the open invoice of each card: the one that closes next. "What is left to pay" and
// "the next parcel" of an installment plan start from it. `transactions` asks it through its
// `OpenInvoiceMonthReader`, which this class satisfies. An id that is not a card is left out.
export class GetOpenInvoiceMonthsQuery {
  private readonly cards: CardReader;
  private readonly clock: Clock;

  constructor(cards: CardReader, clock: Clock) {
    this.cards = cards;
    this.clock = clock;
  }

  async openMonthsOf(
    accountIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, Month>> {
    const today = this.clock.today();
    const cards = await this.cards.findCards(accountIds, executor);

    return new Map(
      [...cards.values()].map((card) => [
        card.id,
        new InvoiceCycle(card.closingDay, card.dueDay).monthFor(today),
      ]),
    );
  }
}
