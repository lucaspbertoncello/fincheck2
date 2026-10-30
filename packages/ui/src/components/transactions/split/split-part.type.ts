/** One part of a split transaction: its category (null until chosen) and its share in cents. */
export type SplitPart = {
  id: string;
  categoryId: string | null;
  amountCents: number;
};
