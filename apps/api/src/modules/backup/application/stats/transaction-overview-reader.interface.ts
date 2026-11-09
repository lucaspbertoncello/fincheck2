// What the page Dados asks `transactions` for: how many transactions are kept and the date of the
// oldest. The owner answers with a query of its own.
export interface TransactionOverviewReader {
  execute(): Promise<{ count: number; firstOccurredOn: string | null }>;
}
