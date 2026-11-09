import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { matchInstitutionCode } from '#/modules/sync/infra/pluggy/match-institution-code.util.ts';

// The bank of a MeuPluggy item: its connector says "MeuPluggy", but the checking (or savings)
// account comes named with the legal name of the bank ("Nu Pagamentos S.A."), which
// `matchInstitutionCode` knows. A card comes with the name of a product, so it is never read. Shape
// of the real response observed on 09/11/2026 (the docs of the Pluggy do not say it). Null when the
// item has no such account or its name matches no bank: the connection name stays.
export function deriveMeuPluggyInstitution(
  accounts: readonly BankDataProvider.Account[],
): BankDataProvider.Account['institution'] {
  for (const account of accounts) {
    if (account.type === 'credit_card') continue;
    const code = matchInstitutionCode(account.name);

    if (code !== 'other') return { name: account.name, code };
  }

  return null;
}
