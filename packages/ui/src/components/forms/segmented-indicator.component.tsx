import { motion } from 'motion/react';

/**
 * The pill that slides under the active segment of a track whose segments differ in width
 * (240 ms, the same as `SegmentedSlide`; layout animation only). The equal-width tracks use
 * `SegmentedSlide` instead, which also changes color.
 */
export function SegmentedIndicator({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      data-tone="neutral"
      className="absolute inset-0 rounded-capsule bg-(--color-surface-segment-indicator) shadow-(--shadow-indicator)"
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
    />
  );
}
