import type { AgendaBill } from '#/modules/dashboard/domain/agenda/agenda-bill.type.ts';

// Port to the bills to pay and to receive (and the debts with friends), all of them, each with the
// transaction that most likely paid it and has no link yet (the presumed payment). The owner is
// `bills`.
export interface AgendaBillReader {
  listBills(): Promise<AgendaBill[]>;
}
