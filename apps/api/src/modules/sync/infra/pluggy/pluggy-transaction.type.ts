export namespace PluggyTransaction {
  export type Response = {
    id: string;
    description?: string | null;
    descriptionRaw?: string | null;
    amount: number;
    amountInAccountCurrency?: number | null;
    currencyCode?: string;
    date: string;
    status?: string;
    type?: string;
    operationType?: string | null;
    paymentData?: {
      payer?: { name?: string | null } | null;
      receiver?: { name?: string | null } | null;
      paymentMethod?: string | null;
    } | null;
    providerId?: string | null;
    creditCardMetadata?: {
      installmentNumber?: number | null;
      totalInstallments?: number | null;
      totalAmount?: number | null;
      purchaseDate?: string | null;
      billId?: string | null;
      cardNumber?: string | null;
    } | null;
  };
}
