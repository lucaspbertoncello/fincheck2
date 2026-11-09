import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillPaymentCandidateFinder } from '#/modules/bills/application/bill-payment/bill-payment-candidate-finder.service.ts';
import { requireBill } from '#/modules/bills/application/bill/require-bill.util.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';

// The transactions Lucas may tie to a bill that exists ("Registrar pagamento" with a transaction;
// RF-BIL-002, 003).
export class ListBillPaymentCandidatesQuery {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly finder: BillPaymentCandidateFinder;

  constructor(bills: BillRepository<Kysely<Database>>, finder: BillPaymentCandidateFinder) {
    this.bills = bills;
    this.finder = finder;
  }

  async execute(
    input: ListBillPaymentCandidatesQuery.Input,
  ): Promise<ListBillPaymentCandidatesQuery.Output> {
    const bill = await requireBill(this.bills, input.id);

    return {
      items: await this.finder.find({
        direction: bill.direction,
        counterparty: bill.counterparty,
        dismissedTransactionIds: bill.dismissedTransactionIds,
      }),
    };
  }
}

export namespace ListBillPaymentCandidatesQuery {
  export type Input = BillContract.Params;
  export type Output = { items: BillContract.PaymentCandidateDto[] };
}
