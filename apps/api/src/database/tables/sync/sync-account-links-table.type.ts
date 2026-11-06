export interface SyncAccountLinksTable {
  pluggy_account_id: string;
  pluggy_name: string;
  pluggy_type: 'checking' | 'savings' | 'credit_card';
  connection_id: string;
  account_id: string | null;
  number_hint: string | null;
  cursor_on: string | null;
}
