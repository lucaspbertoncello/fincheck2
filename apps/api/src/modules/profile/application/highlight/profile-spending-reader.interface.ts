// Port to the spending between two days, by competence (BR-DSH-001): not ignored, no transfer
// between own accounts, a split transaction by its parts. The owner is `transactions`.
export interface ProfileSpendingReader {
  listSpendingLines(period: { from: string; to: string }): Promise<ProfileSpendingReader.Line[]>;
}

export namespace ProfileSpendingReader {
  export type Line = {
    // The day it counts as spending, `YYYY-MM-DD`.
    on: string;
    // Positive for a purchase, negative for a refund.
    cents: number;
    categoryId: string | null;
  };
}
