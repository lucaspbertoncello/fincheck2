export interface InvoicePaymentsTable {
  id: string;
  invoice_id: string;
  transaction_id: string | null;
  amount_cents: number;
  paid_on: string;
  created_at: string;
}
