import type { IconName } from '#/components/icons/icon-markup.constant.ts';

/** A category the user can pick: id, name and the icon of its circle. */
export type CategoryOption = {
  id: string;
  name: string;
  icon: IconName;
};
