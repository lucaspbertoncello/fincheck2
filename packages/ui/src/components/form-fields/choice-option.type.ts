import type { IconName } from '#/components/icons/icon-markup.constant.ts';

/** One option of a choice or select field. */
export type ChoiceOption = {
  key: string;
  label: string;
  /** Icon before the label (18 px in chips, 20 px in the select list). */
  icon?: IconName;
  /** Second line in the select list ("Conta corrente · final 1234"). */
  hint?: string;
};
