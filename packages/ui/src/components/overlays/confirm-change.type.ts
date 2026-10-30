import type { IconName } from '#/components/icons/icon-markup.constant.ts';

/** One line of the "o que muda" list of a confirmation (components.md 13.3). */
export type ConfirmChange = {
  /** 16 px icon; a check by default. */
  icon?: IconName;
  text: string;
};

/** The "antes" struck through and the "depois", for example the old and new category. */
export type ConfirmPreview = {
  before: string;
  after: string;
};
