import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { requireCard } from '#/modules/invoices/application/card/require-card.util.ts';
import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The invoice (month of the closing) a purchase on a card falls in, by the closing day of the card
// today: until the closing it goes in the invoice of the month, after it in the next one
// (BR-INV-001). `transactions` asks it through its `InvoiceMonthReader`, which this class
// satisfies; the cycle rule lives in `InvoiceCycle`.
export class GetInvoiceMonthQuery {
  private readonly cards: CardReader;

  constructor(cards: CardReader) {
    this.cards = cards;
  }

  async monthFor(
    accountId: string,
    purchaseOn: BusinessDate,
    executor?: Kysely<Database>,
  ): Promise<Month> {
    const card = await requireCard(this.cards, accountId, executor);

    return new InvoiceCycle(card.closingDay, card.dueDay).monthFor(purchaseOn);
  }
}
