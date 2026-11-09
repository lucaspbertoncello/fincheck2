import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';
import { BillNotFoundError } from '#/modules/bills/domain/bill/bill-not-found.error.ts';
import type { BillRepository } from '#/modules/bills/domain/bill/bill-repository.interface.ts';

// The bill, or `BILL_NOT_FOUND`.
export async function requireBill(
  bills: BillRepository<Kysely<Database>>,
  id: string,
  executor?: Kysely<Database>,
): Promise<Bill> {
  const bill = await bills.findById(id, executor);
  if (!bill) throw new BillNotFoundError();

  return bill;
}
