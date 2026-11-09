import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import { requireBill } from '#/modules/bills/application/bill/require-bill.util.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';

// The detail of a bill, with its payments and its origin.
export class GetBillQuery {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly builder: BillDtoBuilder;

  constructor(bills: BillRepository<Kysely<Database>>, builder: BillDtoBuilder) {
    this.bills = bills;
    this.builder = builder;
  }

  async execute(input: GetBillQuery.Input): Promise<GetBillQuery.Output> {
    return this.builder.buildOne(await requireBill(this.bills, input.id));
  }
}

export namespace GetBillQuery {
  export type Input = BillContract.Params;
  export type Output = BillContract.Dto;
}
