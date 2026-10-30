import { motion } from 'motion/react';

/** The white pill that slides under the active segment (220 ms, layout animation only). */
export function SegmentedIndicator({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden="true"
      className="absolute inset-0 rounded-capsule bg-(--color-surface-segment-indicator) shadow-(--shadow-indicator)"
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
    />
  );
}
