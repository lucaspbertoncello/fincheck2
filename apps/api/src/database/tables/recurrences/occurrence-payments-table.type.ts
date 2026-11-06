export interface OccurrencePaymentsTable {
  id: string;
  occurrence_id: string;
  transaction_id: string;
  amount_cents: number;
  linked_by: 'auto' | 'user';
  created_at: string;
}
