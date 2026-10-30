/** What the delete confirmation says: what goes, what stays, and what the next sync brings back. */
export type DeletionSummary = {
  /** One sentence per thing that is erased; empty for an account with nothing in it. */
  gone: string[];
  stays: string[];
  /** Set when the bank sends the account again after the delete. */
  returnNote: string | null;
};
