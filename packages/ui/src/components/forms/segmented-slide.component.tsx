import { cx } from '#/utils/class-names.util.ts';
import type { SegmentedTone } from '#/components/forms/segmented-indicator.type.ts';

const TONE_CLASS: Record<SegmentedTone, string> = {
  neutral: 'bg-(--color-surface-segment-indicator) shadow-(--shadow-indicator)',
  loss: 'bg-loss-weak shadow-none',
  gain: 'bg-gain-weak shadow-none',
};

type SegmentedSlideProps = {
  /** Position of the chosen segment, from 0. */
  index: number;
  /** How many segments the track has: they are all the same width. */
  count: number;
  tone?: SegmentedTone;
};

/**
 * The one pill of a track with equal segments (the `direction` control, Despesa | Receita). It is
 * a single element that stays mounted: choosing another segment moves it with `transform` and
 * changes its fill in the same 240 ms and curve as the other selectors (`duration-slide`,
 * `ease-standard`), so the red of Despesa turns into the green of Receita while it slides.
 * Reduced motion drops the transition: it jumps. The track must be `relative`; the pill sits in
 * the track's 4 px padding.
 */
export function SegmentedSlide({ index, count, tone = 'neutral' }: SegmentedSlideProps) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-s4">
      <span
        data-tone={tone}
        className={cx(
          'block h-full rounded-capsule',
          'transition-[transform,background-color,box-shadow] duration-(--duration-slide) ease-(--ease-standard) motion-reduce:transition-none',
          TONE_CLASS[tone],
        )}
        style={{ width: `${100 / count}%`, transform: `translateX(${index * 100}%)` }}
      />
    </span>
  );
}
