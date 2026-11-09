export namespace PluggyBill {
  export type Response = {
    id: string;
    dueDate: string;
    totalAmount: number;
    totalAmountCurrencyCode?: string | null;
  };
}
