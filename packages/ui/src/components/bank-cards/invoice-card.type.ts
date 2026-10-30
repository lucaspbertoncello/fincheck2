export type InvoiceStatus = 'open' | 'closed' | 'paid';

/** One installment due on the invoice ("Magazine Luiza · Parcela 3 de 10 · R$ 129,90"). */
export type InvoiceInstallment = {
  id: string;
  merchant: string;
  /** "Parcela 3 de 10". */
  partLabel: string;
  cents: number;
};
