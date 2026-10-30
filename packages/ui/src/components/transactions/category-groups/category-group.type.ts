import type { IconName } from '#/components/icons/index.ts';

export type CategoryGroupItem = {
  id: string;
  /** "22 out." */
  dateLabel: string;
  name: string;
  /** "Nubank, crédito". */
  accountLabel: string;
  /** Integer cents, positive. */
  cents: number;
};

/** One category (or income source) of the "por categoria" view, ready to draw. */
export type CategoryGroupData = {
  id: string;
  name: string;
  icon: IconName;
  /** "Sem categoria": dashed icon and bar, "Revisar" instead of the variation. */
  uncategorized?: boolean;
  /** Integer cents, positive: the sign comes from the kind of the list. */
  totalCents: number;
  /** Share of the list total, in percent (23.3). Sets the width of the bar. */
  sharePercent: number;
  /** Number of transactions. */
  count: number;
  /** Signed percent against the previous month. Leave out when there is no comparison. */
  variationPercent?: number;
  /** Replaces the "N transações · X%" line ("Nenhuma ainda · Maxxy, R$ 4.200,00"). */
  detail?: string;
  /** Small text under the value in place of the variation ("Previsto 25/10"). */
  caption?: string;
  /** The last transactions, shown when the group opens. */
  items?: readonly CategoryGroupItem[];
};
