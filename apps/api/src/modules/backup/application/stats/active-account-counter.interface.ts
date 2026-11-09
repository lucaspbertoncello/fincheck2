// What the page Dados asks `accounts` for: how many accounts and cards are not archived. The owner
// answers with a query of its own.
export interface ActiveAccountCounter {
  execute(): Promise<number>;
}
