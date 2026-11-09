import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BillDtoBuilder } from '#/modules/bills/application/bill/bill-dto-builder.service.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';

// The names already used in debts with friends, to suggest in the modal (RF-BIL-003). Groups by the
// normalized name and shows the spelling of the most recent bill; `openBillsCount` counts the ones
// not settled, in both directions. Order: most recent use first.
export class ListBillCounterpartiesQuery {
  private readonly bills: BillRepository<Kysely<Database>>;
  private readonly builder: BillDtoBuilder;

  constructor(bills: BillRepository<Kysely<Database>>, builder: BillDtoBuilder) {
    this.bills = bills;
    this.builder = builder;
  }

  async execute(): Promise<ListBillCounterpartiesQuery.Output> {
    const friends = (await this.bills.findAll()).filter(
      (bill) => bill.kind === 'friend' && bill.counterparty !== null,
    );
    const dtos = new Map((await this.builder.buildMany(friends)).map((dto) => [dto.id, dto]));

    const groups = new Map<
      string,
      { name: string; lastCreatedAt: string; lastId: string; open: number }
    >();
    for (const bill of friends) {
      const name = bill.counterparty ?? '';
      const key = normalizeText(name);
      const group = groups.get(key) ?? { name, lastCreatedAt: '', lastId: '', open: 0 };
      if (
        bill.createdAt > group.lastCreatedAt ||
        (bill.createdAt === group.lastCreatedAt && bill.id > group.lastId)
      ) {
        group.name = name;
        group.lastCreatedAt = bill.createdAt;
        group.lastId = bill.id;
      }
      if (dtos.get(bill.id)?.status !== 'settled') group.open += 1;
      groups.set(key, group);
    }

    const items = [...groups.values()]
      .sort(
        (a, b) => b.lastCreatedAt.localeCompare(a.lastCreatedAt) || a.name.localeCompare(b.name),
      )
      .map((group) => ({ name: group.name, openBillsCount: group.open }));

    return { items };
  }
}

export namespace ListBillCounterpartiesQuery {
  export type Output = { items: BillContract.CounterpartyDto[] };
}
