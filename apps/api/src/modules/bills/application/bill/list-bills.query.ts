import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';

// The bills and debts (RF-BIL-001, 003). `open` (the default) is everything not settled. Order: due
// day ascending, the ones without a day at the end, then creation.
export class ListBillsQuery {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly builder: BillDtoBuilder;

  constructor(bills: BillRepository<Kysely<Database>>, builder: BillDtoBuilder) {
    this.bills = bills;
    this.builder = builder;
  }

  async execute(input: ListBillsQuery.Input): Promise<ListBillsQuery.Output> {
    const status = input.status ?? 'open';
    const all = (await this.bills.findAll()).filter(
      (bill) =>
        (input.direction === undefined || bill.direction === input.direction) &&
        (input.kind === undefined || bill.kind === input.kind),
    );
    const items = (await this.builder.buildMany(all)).filter(
      (dto) =>
        status === 'all' ||
        (status === 'settled' ? dto.status === 'settled' : dto.status !== 'settled'),
    );

    items.sort(
      (a, b) =>
        Number(a.dueOn === null) - Number(b.dueOn === null) ||
        (a.dueOn ?? '').localeCompare(b.dueOn ?? '') ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );

    return { items };
  }
}

export namespace ListBillsQuery {
  export type Input = BillContract.ListQuery;
  export type Output = { items: BillContract.Dto[] };
}
