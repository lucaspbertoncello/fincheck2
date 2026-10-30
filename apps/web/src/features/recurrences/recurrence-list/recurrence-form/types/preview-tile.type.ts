/** One next date of the rule, split for the trail: "sex" / "20" / "nov". */
export type PreviewTile = {
  key: string;
  /** "sex"; empty when the rule has no fixed day. */
  weekday: string;
  /** "20"; "…" when the rule has no fixed day. */
  day: string;
  /** "nov". */
  month: string;
  /** For assistive technology: "sexta-feira, 20 de novembro" or "qualquer dia de novembro". */
  label: string;
};
