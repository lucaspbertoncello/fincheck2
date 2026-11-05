import type { IconName } from '#/components/icons/icon-markup.constant.ts';

export type FormModalDestructive = {
  /** "Excluir". */
  label: string;
  onPress: () => void;
  icon?: IconName;
};
