export interface SyncRunsTable {
  id: string;
  connection_id: string;
  trigger: 'schedule' | 'first_connection' | 'retry';
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  error_code: string | null;
  created_count: number;
  updated_count: number;
  removed_count: number;
}
