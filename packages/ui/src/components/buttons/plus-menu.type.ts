import type { IconName } from '#/components/icons/icon-markup.constant.ts';

export type PlusMenuItem = {
  key: string;
  label: string;
  description?: string;
  icon: IconName;
  /** Draws the divider before this item. */
  separatorBefore?: boolean;
};
