import type { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';

// The port to the store of connections: the root with its links to the accounts of the Pluggy.
// `Executor` is the database handle: pass the one of a unit of work to read and write inside it.
export interface ConnectionRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<Connection | null>;
  findByPluggyItemId(pluggyItemId: string, executor?: Executor): Promise<Connection | null>;
  // Every connection, disconnected ones included.
  list(executor?: Executor): Promise<Connection[]>;
  // Creates or updates the connection and replaces its links to the accounts.
  save(connection: Connection, executor?: Executor): Promise<void>;
  // Who holds each account of Fincheck: the connection and the end of the number the Pluggy had sent.
  // An account no link points to is absent.
  findOwnersOfAccounts(
    accountIds: string[],
    executor?: Executor,
  ): Promise<Map<string, ConnectionRepository.Owner>>;
  // Deletes the links that point to these accounts (the account goes to another item).
  releaseAccounts(accountIds: string[], executor?: Executor): Promise<void>;
}

export namespace ConnectionRepository {
  export type Owner = {
    connectionId: string;
    connectionStatus: 'active' | 'error' | 'disconnected';
    numberHint: string | null;
    pluggyType: 'checking' | 'savings' | 'credit_card';
  };
}
