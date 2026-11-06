import type { IconName } from '#/components/icons/icon-markup.constant.ts';

export type SegmentedNavItem = {
  key: string;
  label: string;
  href: string;
  /** 18 px icon before the label, in the label color (no flow color in navigation). */
  icon?: IconName;
};
