import type { AgendaAccount } from '#/modules/dashboard/domain/agenda/agenda-account.type.ts';

// Port to the accounts: every account (the archived too, the Livre leaves them out) with its
// balance. A bank account without a balance from the bank comes with a null balance. The owner is
// `accounts`.
export interface DashboardAccountReader {
  listAccounts(): Promise<AgendaAccount[]>;
}
