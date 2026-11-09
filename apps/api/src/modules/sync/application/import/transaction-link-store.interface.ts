// The port to the links between the transactions of the Pluggy and the ones of Fincheck: what makes
// the import idempotent. The id of the Pluggy never goes beyond `sync`. There is one link per
// transaction and one per id of the Pluggy. `Executor` is the database handle: pass the one of a unit
// of work to read and write inside it.
export interface TransactionLinkStore<Executor> {
  // The links of the ids of the Pluggy (the ones that exist).
  findByPluggyIds(
    pluggyIds: string[],
    executor?: Executor,
  ): Promise<Map<string, TransactionLinkStore.Link>>;
  // The links of the transactions of Fincheck (the ones that exist), keyed by the transaction.
  findByTransactionIds(
    transactionIds: string[],
    executor?: Executor,
  ): Promise<Map<string, TransactionLinkStore.Link>>;
  // Creates the link or moves it: the transaction ends up with one link, to this id of the Pluggy.
  put(link: TransactionLinkStore.Link, executor?: Executor): Promise<void>;
  // The round saw these ids of the Pluggy.
  touch(pluggyIds: string[], seenAt: string, executor?: Executor): Promise<void>;
}

export namespace TransactionLinkStore {
  export type Link = {
    pluggyId: string;
    transactionId: string;
    // The id the bank itself gives (Open Finance), when it sent one.
    providerRef: string | null;
    lastSeenAt: string;
  };
}
