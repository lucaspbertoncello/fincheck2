import type { DashboardAccountReader } from '#/modules/dashboard/application/account/dashboard-account-reader.interface.ts';
import type { ListAccountsUseCase } from '#/modules/accounts/application/account/list-accounts.usecase.ts';

// The reader of accounts `dashboard` declares, over the use case that lists them: every account,
// the archived ones included, in the order of `GET /accounts` (by type, then by name).
export function createDashboardAccountReader(
  listAccounts: ListAccountsUseCase,
): DashboardAccountReader {
  return {
    async listAccounts() {
      const { items } = await listAccounts.execute({ includeArchived: true });

      return items.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        source: account.source,
        institutionCode: account.institutionCode,
        balanceCents: account.balanceCents,
        isArchived: account.archivedAt !== null,
      }));
    },
  };
}
