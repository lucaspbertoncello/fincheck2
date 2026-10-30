/** A tag with its count of transactions in the whole history. */
export type TagItem = {
  id: string;
  /** Name without the "#". */
  name: string;
  transactionCount: number;
  archived?: boolean;
};
