import type { BillPayment as BillPaymentContract } from '@fincheck/shared/bills/bill-payment/bill-payment.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillPaymentLinker } from '#/modules/bills/application/bill-payment/bill-payment-linker.service.ts';
import { requireBill } from '#/modules/bills/application/bill/require-bill.util.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Desfazer" a payment or receipt (RF-BIL-002): the transaction gets its place back (the money that
// came back from a friend returns to `income`, the category the bill put is taken off; the Pix paid
// to a friend stays an `expense`). A payment by hand touches no transaction.
export class DeleteBillPaymentUseCase {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly linker: BillPaymentLinker;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    linker: BillPaymentLinker,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.bills = bills;
    this.linker = linker;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: DeleteBillPaymentUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const bill = await requireBill(this.bills, input.id, executor);

      const payment = bill.removePayment(input.paymentId, this.clock.now());
      await this.linker.unlink(bill, payment, executor);
      await this.bills.save(bill, executor);
    });
  }
}

export namespace DeleteBillPaymentUseCase {
  export type Input = BillPaymentContract.Params;
}
