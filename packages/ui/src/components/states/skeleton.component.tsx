import { cx } from '#/utils/class-names.util.ts';

type SkeletonProps = {
  /** Size classes of the block it stands for (the same width and height as the real content). */
  className?: string;
};

/** Loading block in the grid color; it pulses only without reduced motion (components.md 14.2). */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx('skeleton-pulse block rounded-capsule bg-track', className)}
    />
  );
}
