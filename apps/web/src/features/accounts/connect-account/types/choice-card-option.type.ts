import type { IconName } from '@fincheck/ui';

export type ChoiceCardOption<T extends string> = {
  value: T;
  label: string;
  icon: IconName;
  /** One line under the label; leave out for the compact card. */
  description?: string;
};
