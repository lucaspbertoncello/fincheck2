import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import type { SegmentedTone } from '#/components/forms/segmented-indicator.type.ts';

export type SegmentedOption = {
  key: string;
  label: string;
  /** 18 px icon before the label ("Lista | Por categoria"). */
  icon?: IconName;
  /**
   * Direction tone (`direction` mode): the slide takes the soft red or green and the tilted
   * card-dot the strong one; "neutral" keeps the white pill and a gray dot.
   */
  tone?: SegmentedTone;
};
