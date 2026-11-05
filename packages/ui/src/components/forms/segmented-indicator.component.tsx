import { motion } from 'motion/react';

import { cx } from '#/utils/class-names.util.ts';
import type { SegmentedTone } from '#/components/forms/segmented-indicator.type.ts';

const TONE_CLASS: Record<SegmentedTone, string> = {
  neutral: 'bg-(--color-surface-segment-indicator) shadow-(--shadow-indicator)',
  loss: 'bg-loss-weak',
  gain: 'bg-gain-weak',
};

/**
 * The pill that slides under the active segment (220 ms, layout animation only). White by default;
 * with a tone it takes the soft fill of the direction (the shared layout crossfades the colors).
 */
export function SegmentedIndicator({
  layoutId,
  tone = 'neutral',
}: {
  layoutId: string;
  tone?: SegmentedTone;
}) {
  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      data-tone={tone}
      className={cx('absolute inset-0 rounded-capsule', TONE_CLASS[tone])}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
    />
  );
}
