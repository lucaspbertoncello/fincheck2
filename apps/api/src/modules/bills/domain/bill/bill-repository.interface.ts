import type { Bill } from '#/modules/bills/domain/bill/bill.entity.ts';

// The port to the store of bills: the root with its payments and dismissals. `Executor` is the
// database handle: pass the one of a unit of work to read and write inside it.
export interface BillRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<Bill | null>;
  findAll(executor?: Executor): Promise<Bill[]>;
  // Which of the transactions are the payment or the origin of any bill.
  findLinkedTransactionIds(transactionIds: string[], executor?: Executor): Promise<Set<string>>;
  // Creates or updates the bill, replacing its payments and dismissals.
  save(bill: Bill, executor?: Executor): Promise<void>;
  // The payments go by `ON DELETE CASCADE`.
  delete(id: string, executor?: Executor): Promise<void>;
}
