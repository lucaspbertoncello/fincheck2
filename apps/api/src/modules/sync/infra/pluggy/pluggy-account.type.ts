export namespace PluggyAccount {
  export type Response = {
    id: string;
    type: string;
    subtype: string;
    name: string;
    marketingName?: string | null;
    balance?: number | null;
    number?: string | null;
    currencyCode?: string;
    creditData?: {
      brand?: string | null;
      level?: string | null;
      // The day the balance was calculated, not the closing day of the card (not read).
      balanceCloseDate?: string | null;
      balanceDueDate?: string | null;
      creditLimit?: number | null;
      availableCreditLimit?: number | null;
    } | null;
  };
}
