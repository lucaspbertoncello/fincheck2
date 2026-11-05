import type { IconName } from '#/components/icons/icon-markup.constant.ts';

export type EmptyStateAction = {
  label: string;
  onPress: () => void;
  icon?: IconName;
};
