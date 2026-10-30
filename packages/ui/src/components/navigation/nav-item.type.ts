import type { IconName } from '#/components/icons/icon-markup.constant.ts';

/** One of the five main destinations, shared by the top tabs and the mobile bottom bar. */
export type NavItem = {
  key: string;
  label: string;
  /** Short label for the mobile bar ("Contas" instead of "Contas e cartões"). */
  shortLabel?: string;
  href: string;
  icon: IconName;
};
