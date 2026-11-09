// Port to the Pluggy connections, for the freshness seal and the alerts. The owner is `sync`, which
// `main` plugs in once it exists; without it there are no connections to show.
export interface ConnectionReader {
  listConnections(): Promise<ConnectionReader.Connection[]>;
}

export namespace ConnectionReader {
  export type Connection = {
    connectionId: string;
    institutionName: string;
    status: 'active' | 'error' | 'disconnected';
    // When the bank last updated the data, an instant in UTC; null before the first round.
    lastBankUpdateAt: string | null;
  };
}
