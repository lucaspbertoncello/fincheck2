export interface RecurrenceOccurrencesTable {
  id: string;
  recurrence_id: string;
  month: string;
  expected_on: string | null;
  window_start_on: string;
  window_end_on: string;
  expected_amount_cents: number;
  settled_at: string | null;
  skipped_at: string | null;
  difference_decision: 'updated' | 'kept' | null;
  created_at: string;
  updated_at: string;
}
