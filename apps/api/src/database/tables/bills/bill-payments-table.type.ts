export interface BillPaymentsTable {
  id: string;
  bill_id: string;
  transaction_id: string | null;
  amount_cents: number;
  paid_on: string;
  created_at: string;
}
