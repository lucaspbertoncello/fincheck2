import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';

type Method =
  | 'verifyCredentials'
  | 'createConnectToken'
  | 'getItem'
  | 'listAccounts'
  | 'listTransactions'
  | 'listInvoices';

// The Pluggy as a double of the port `BankDataProvider`: nothing leaves the process. What it knows
// is in plain maps a test fills (the items, the accounts of each item, the transactions of each
// account, the invoices); `fail` makes one method throw the kind of `BankProviderError` given, for
// as long as the test wants; the keys it accepts are `validCredentials`. `calls` writes down what was
// asked (the method and its target, never the keys), and `fromOn` what window each fetch asked.
export class FakeBankProvider implements BankDataProvider {
  validCredentials: BankDataProvider.Credentials = {
    clientId: 'client-id-test',
    clientSecret: 'client-secret-test',
  };
  readonly items = new Map<string, BankDataProvider.Item>();
  readonly accounts = new Map<string, BankDataProvider.Account[]>();
  readonly transactions = new Map<string, BankDataProvider.Transaction[]>();
  readonly invoices = new Map<string, BankDataProvider.Invoice[]>();
  readonly failures = new Map<Method, BankProviderError.Kind>();
  readonly calls: string[] = [];
  readonly fromOn: { accountId: string; fromOn: string }[] = [];
  // The keys the double received, to check that none of them goes anywhere else.
  readonly keysSeen: BankDataProvider.Credentials[] = [];

  fail(method: Method, kind: BankProviderError.Kind): void {
    this.failures.set(method, kind);
  }

  recover(method: Method): void {
    this.failures.delete(method);
  }

  countCalls(method: Method): number {
    return this.calls.filter((call) => call.startsWith(`${method}:`)).length;
  }

  async verifyCredentials(credentials: BankDataProvider.Credentials): Promise<void> {
    this.enter('verifyCredentials', '', credentials);
  }

  async createConnectToken(
    credentials: BankDataProvider.Credentials,
  ): Promise<BankDataProvider.ConnectToken> {
    this.enter('createConnectToken', '', credentials);

    return { connectToken: 'connect-token-test', expiresAt: '2026-11-09T15:30:00.000Z' };
  }

  async getItem(
    credentials: BankDataProvider.Credentials,
    itemId: string,
  ): Promise<BankDataProvider.Item> {
    this.enter('getItem', itemId, credentials);
    const item = this.items.get(itemId);
    if (!item) throw new BankProviderError('item_not_found');

    return structuredClone(item);
  }

  async listAccounts(
    credentials: BankDataProvider.Credentials,
    itemId: string,
  ): Promise<BankDataProvider.Account[]> {
    this.enter('listAccounts', itemId, credentials);

    return structuredClone(this.accounts.get(itemId) ?? []);
  }

  async listTransactions(
    credentials: BankDataProvider.Credentials,
    accountId: string,
    fromOn: string,
  ): Promise<BankDataProvider.Transaction[]> {
    this.enter('listTransactions', accountId, credentials);
    this.fromOn.push({ accountId, fromOn });

    return structuredClone(
      (this.transactions.get(accountId) ?? []).filter(
        (transaction) => transaction.occurredOn >= fromOn,
      ),
    );
  }

  async listInvoices(
    credentials: BankDataProvider.Credentials,
    accountId: string,
  ): Promise<BankDataProvider.Invoice[]> {
    this.enter('listInvoices', accountId, credentials);

    return structuredClone(this.invoices.get(accountId) ?? []);
  }

  private enter(method: Method, target: string, credentials: BankDataProvider.Credentials): void {
    this.calls.push(`${method}:${target}`);
    this.keysSeen.push(credentials);
    const failure = this.failures.get(method);
    if (failure) throw new BankProviderError(failure);
    if (
      credentials.clientId !== this.validCredentials.clientId ||
      credentials.clientSecret !== this.validCredentials.clientSecret
    ) {
      throw new BankProviderError('credentials_invalid');
    }
  }
}
