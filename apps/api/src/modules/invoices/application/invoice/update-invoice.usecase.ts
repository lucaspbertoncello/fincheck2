import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { requireCard } from '#/modules/invoices/application/card/require-card.util.ts';
import type { InvoiceDtoBuilder } from '#/modules/invoices/application/invoice/invoice-dto-builder.service.ts';
import type { InvoiceOpener } from '#/modules/invoices/application/invoice/invoice-opener.service.ts';
import { computeInvoicePhase } from '#/modules/invoices/domain/invoice/compute-invoice-phase.util.ts';
import type { InvoiceRepository } from '#/modules/invoices/domain/invoice/invoice-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Corrigir valor" (BR-INV-004): the correction of Lucas wins over the total of the bank and the
// calculated one. The invoice row is born here if it does not exist yet. A projection (a month
// that has not opened) cannot be corrected.
export class UpdateInvoiceUseCase {
  private readonly cards: CardReader;
  private readonly invoices: InvoiceRepository<Kysely<Database>>;
  private readonly opener: InvoiceOpener;
  private readonly builder: InvoiceDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    cards: CardReader,
    invoices: InvoiceRepository<Kysely<Database>>,
    opener: InvoiceOpener,
    builder: InvoiceDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.cards = cards;
    this.invoices = invoices;
    this.opener = opener;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UpdateInvoiceUseCase.Input): Promise<UpdateInvoiceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const now = this.clock.now();
      const card = await requireCard(this.cards, input.accountId, executor);
      const month = Month.of(input.month);
      assertSupportedMonth(month, 'month');
      const phase = computeInvoicePhase(month, this.builder.openMonthOf(card));

      const invoice = await this.opener.loadOrOpen(card, month, now, executor);
      invoice.correctTotal(
        {
          ...(input.totalOverrideCents === undefined
            ? {}
            : {
                totalOverride:
                  input.totalOverrideCents === null
                    ? null
                    : Money.fromCents(input.totalOverrideCents),
              }),
          ...(input.overrideNote === undefined ? {} : { overrideNote: input.overrideNote }),
        },
        phase,
        now,
      );
      await this.invoices.save(invoice, executor);

      const [dto] = await this.builder.buildMany(card, [month], executor);
      if (!dto) throw new RangeError('The invoice was not built');

      return dto;
    });
  }
}

export namespace UpdateInvoiceUseCase {
  export type Input = Invoice.Params & Invoice.UpdateRequest;
  export type Output = Invoice.Dto;
}
