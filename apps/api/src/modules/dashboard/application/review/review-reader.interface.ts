// Port to the queue "Para revisar" (BR-CAT-008). `countInPeriod` counts by competence between two
// days (either may be left out) and adds up the absolute amounts; `countByAccount` is the whole
// queue, with no month, per account (only the accounts that have something waiting). The owner is
// `transactions`.
export interface ReviewReader {
  countInPeriod(period: {
    from?: string;
    to?: string;
  }): Promise<{ count: number; totalCents: number }>;
  countByAccount(): Promise<{ accountId: string; count: number }[]>;
}
