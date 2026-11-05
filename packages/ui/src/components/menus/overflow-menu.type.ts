import type { IconName } from '#/components/icons/icon-markup.constant.ts';

export type OverflowMenuItem = {
  key: string;
  label: string;
  icon?: IconName;
  /** Destructive item (Excluir): text and icon in the expense color. */
  danger?: boolean;
  /** Draws the divider before this item, to separate groups. */
  separatorBefore?: boolean;
  isDisabled?: boolean;
};
