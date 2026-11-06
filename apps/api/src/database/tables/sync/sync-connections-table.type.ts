export interface SyncConnectionsTable {
  id: string;
  pluggy_item_id: string;
  institution_code: string;
  institution_name: string;
  status: 'active' | 'error' | 'disconnected';
  error_code: string | null;
  last_bank_update_at: string | null;
  last_success_at: string | null;
  history_status: 'pending' | 'running' | 'done';
  history_from_on: string | null;
  created_at: string;
  updated_at: string;
}
