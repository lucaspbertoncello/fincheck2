import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { InvoiceMonthReader } from '#/modules/transactions/application/transaction/invoice-month-reader.interface.ts';
import { requireWiredReader } from '#/modules/transactions/application/transaction/require-wired-reader.util.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { assertSupportedDate } from '#/shared/date/assert-supported-date.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

// The invoice month of a purchase on a card; null outside a card. It only asks `invoices` for the
// cycle: `transactions` does not know the closing day nor the rule. While `invoices` is not wired,
// a card purchase is refused with a 400 (the least bad way out: refusing keeps a wrong invoice
// from being stored, and an invented one would be exactly that).
export class InvoiceMonthResolver {
  private readonly reader: InvoiceMonthReader | undefined;

  constructor(reader: InvoiceMonthReader | undefined) {
    this.reader = reader;
  }

  async resolve(
    account: Transaction.AccountRef,
    purchaseOn: BusinessDate,
    executor: Kysely<Database>,
  ): Promise<Month | null> {
    if (!account.isCard) return null;
    assertSupportedDate(purchaseOn, 'occurredOn');

    return requireWiredReader(this.reader, 'accountId', 'o contexto de faturas').monthFor(
      account.id,
      purchaseOn,
      executor,
    );
  }
}
