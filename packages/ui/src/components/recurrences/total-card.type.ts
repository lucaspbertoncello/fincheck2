export type TotalCardItem = {
  key: string;
  label: string;
  /** Under the label: "vence 25/10". */
  note?: string;
  cents: number;
  /** Makes the label a link to where the line comes from (the person on the friends tab). */
  href?: string;
  /** Said after the label by a screen reader only, so the link name keeps the visible text. */
  srHint?: string;
};

/** A line under the value of a `TotalCard`: plain text, or a link to where the number comes from. */
export type TotalCardDetail = {
  key: string;
  /** What the line says: "R$ 3.387,22 já recebidos". */
  text: string;
  /** Makes the line a link, with a "›" after it. Without it the line is plain text. */
  href?: string;
  /**
   * Said after the text by a screen reader only, so the name of the link keeps the visible text
   * (WCAG 2.5.3) and adds where it goes: "R$ 3.387,22 já recebidos, ver as transações recebidas".
   */
  srHint?: string;
};
