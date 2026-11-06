export interface SyncTransactionLinksTable {
  pluggy_transaction_id: string;
  transaction_id: string;
  provider_ref: string | null;
  last_seen_at: string;
}
