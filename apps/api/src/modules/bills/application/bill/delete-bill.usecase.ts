import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillPaymentLinker } from '#/modules/bills/application/bill-payment/bill-payment-linker.service.ts';
import type { BillTransactionWriter } from '#/modules/bills/application/bill-payment/bill-transaction-writer.interface.ts';
import { requireBill } from '#/modules/bills/application/bill/require-bill.util.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Deletes the bill and gives back what it did to the transactions (RF-BIL-001): the origin returns
// to `expense` (the category it had is not recovered: it goes to "Para revisar", decision B5), the
// money that came back returns to `income`, the category the bill put is taken off. The payments go
// with the bill.
export class DeleteBillUseCase {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly linker: BillPaymentLinker;
  private readonly writer: BillTransactionWriter;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;

  constructor(
    bills: BillRepository<Kysely<Database>>,
    linker: BillPaymentLinker,
    writer: BillTransactionWriter,
    unitOfWork: UnitOfWork<Kysely<Database>>,
  ) {
    this.bills = bills;
    this.linker = linker;
    this.writer = writer;
    this.unitOfWork = unitOfWork;
  }

  async execute(input: DeleteBillUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const bill = await requireBill(this.bills, input.id, executor);

      for (const payment of bill.payments) await this.linker.unlink(bill, payment, executor);
      if (bill.originTransactionId !== null) {
        await this.writer.releaseLent(bill.originTransactionId, executor);
      }
      await this.bills.delete(bill.id, executor);
    });
  }
}

export namespace DeleteBillUseCase {
  export type Input = BillContract.Params;
}
