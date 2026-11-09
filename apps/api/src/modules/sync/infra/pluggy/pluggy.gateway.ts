import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';
import type { PluggyAccount } from '#/modules/sync/infra/pluggy/pluggy-account.type.ts';
import type { PluggyBill } from '#/modules/sync/infra/pluggy/pluggy-bill.type.ts';
import type { PluggyConnectToken } from '#/modules/sync/infra/pluggy/pluggy-connect-token.type.ts';
import type { PluggyItem } from '#/modules/sync/infra/pluggy/pluggy-item.type.ts';
import type { PluggyTransaction } from '#/modules/sync/infra/pluggy/pluggy-transaction.type.ts';
import { PluggyClient } from '#/modules/sync/infra/pluggy/pluggy.client.ts';
import { translatePluggyAccount } from '#/modules/sync/infra/pluggy/translate-pluggy-account.util.ts';
import { translatePluggyBill } from '#/modules/sync/infra/pluggy/translate-pluggy-bill.util.ts';
import { translatePluggyItem } from '#/modules/sync/infra/pluggy/translate-pluggy-item.util.ts';
import { translatePluggyTransaction } from '#/modules/sync/infra/pluggy/translate-pluggy-transaction.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

const CONNECT_TOKEN_LIFETIME_MS = 30 * 60 * 1000;

// The anti-corruption layer of the Pluggy: the only class that speaks its vocabulary. Everything
// that goes out is in the language of the port, and the only thing that goes out as a failure is a
// `BankProviderError` (anything else, a body that does not fit included, becomes `unavailable`).
export class PluggyGateway implements BankDataProvider {
  private readonly client: PluggyClient;
  private readonly clock: Clock;
  // The type of each account seen, because a transaction only makes sense knowing if it is a card
  // (the sign is the opposite there) and the Pluggy does not say it on the transaction.
  private readonly accountTypes = new Map<string, BankDataProvider.Account['type'] | null>();

  constructor(client: PluggyClient = new PluggyClient(), clock: Clock = new SystemClock()) {
    this.client = client;
    this.clock = clock;
  }

  verifyCredentials(credentials: BankDataProvider.Credentials): Promise<void> {
    return this.guarded(() => this.client.verifyCredentials(credentials));
  }

  createConnectToken(
    credentials: BankDataProvider.Credentials,
  ): Promise<BankDataProvider.ConnectToken> {
    return this.guarded(async () => {
      const response = await this.client.post<PluggyConnectToken.Response>(
        credentials,
        '/connect_token',
        {},
      );

      if (typeof response.accessToken !== 'string' || response.accessToken === '') {
        throw new BankProviderError('unavailable');
      }

      return {
        connectToken: response.accessToken,
        expiresAt: new Date(Date.parse(this.clock.now()) + CONNECT_TOKEN_LIFETIME_MS).toISOString(),
      };
    });
  }

  getItem(
    credentials: BankDataProvider.Credentials,
    itemId: string,
  ): Promise<BankDataProvider.Item> {
    return this.guarded(async () => {
      const response = await this.client.get<PluggyItem.Response>(
        credentials,
        `/items/${encodeURIComponent(itemId)}`,
        {},
        'item',
      );

      return translatePluggyItem(response, this.clock.now());
    });
  }

  listAccounts(
    credentials: BankDataProvider.Credentials,
    itemId: string,
  ): Promise<BankDataProvider.Account[]> {
    return this.guarded(async () => {
      const responses = await this.client.getAllPages<PluggyAccount.Response>(
        credentials,
        '/accounts',
        { itemId },
        'item',
      );
      const accounts: BankDataProvider.Account[] = [];

      for (const response of responses) {
        const account = translatePluggyAccount(response);

        // The ones Fincheck does not keep (investment, loan...) are not even remembered.
        if (account) {
          accounts.push(account);
          this.accountTypes.set(account.id, account.type);
        }
      }

      return accounts;
    });
  }

  listTransactions(
    credentials: BankDataProvider.Credentials,
    accountId: string,
    fromOn: string,
  ): Promise<BankDataProvider.Transaction[]> {
    return this.guarded(async () => {
      const accountType = await this.accountTypeOf(credentials, accountId);

      if (accountType === null) return [];
      // `GET /transactions` (by page) leaves on 31/12/2026: the list by cursor is
      // `GET /v2/transactions` (`dateFrom` is the first day, inclusive).
      const responses = await this.client.getAllCursorPages<PluggyTransaction.Response>(
        credentials,
        '/v2/transactions',
        { accountId, dateFrom: fromOn },
      );
      const transactions: BankDataProvider.Transaction[] = [];

      // The cursor can bring the same transaction on two pages (one entered between the calls): it
      // is one transaction, the last version of it, in the place it came first.
      for (const response of new Map(responses.map((item) => [item.id, item])).values()) {
        const transaction = translatePluggyTransaction(response, accountType);

        if (transaction) transactions.push(transaction);
      }

      return transactions;
    });
  }

  listInvoices(
    credentials: BankDataProvider.Credentials,
    accountId: string,
  ): Promise<BankDataProvider.Invoice[]> {
    return this.guarded(async () => {
      const responses = await this.client.getAllPages<PluggyBill.Response>(credentials, '/bills', {
        accountId,
      });

      return responses.flatMap((response) => translatePluggyBill(response) ?? []);
    });
  }

  // From the memory when `listAccounts` already passed by it; otherwise asks the provider. Null when
  // the account is of a type Fincheck does not keep.
  private async accountTypeOf(
    credentials: BankDataProvider.Credentials,
    accountId: string,
  ): Promise<BankDataProvider.Account['type'] | null> {
    const known = this.accountTypes.get(accountId);

    if (known !== undefined) return known;
    const response = await this.client.get<PluggyAccount.Response>(
      credentials,
      `/accounts/${encodeURIComponent(accountId)}`,
    );
    const type = translatePluggyAccount(response)?.type ?? null;

    this.accountTypes.set(accountId, type);

    return type;
  }

  // Only `BankProviderError` leaves; a `TypeError` of a body that does not fit and any other surprise
  // are `unavailable`, with no message (it could carry part of the body).
  private async guarded<Result>(work: () => Promise<Result>): Promise<Result> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof BankProviderError) throw error;
      throw new BankProviderError('unavailable');
    }
  }
}
