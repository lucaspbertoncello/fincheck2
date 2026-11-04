/** One next date of the rule, ready for the preview list: "sex" / "20 nov" / "18 a 22 nov". */
export type PreviewDate = {
  key: string;
  /** "sex"; empty when the rule has no fixed day. */
  weekday: string;
  /** "20 nov"; the month ("novembro") when the rule has no fixed day. */
  dayMonth: string;
  /** The days the payment may arrive in ("18 a 22 nov"), or "qualquer dia" without a fixed day. */
  note: string | null;
  /** For assistive technology: "sexta-feira, 20 de novembro, pode chegar de 18 a 22 de novembro". */
  label: string;
};

/** What the preview box shows: the dates, a place-holder while they arrive, or why there are none. */
export type PreviewStatus = 'ready' | 'loading' | 'incomplete' | 'unavailable';
