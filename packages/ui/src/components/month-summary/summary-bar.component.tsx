import type { SummaryBarSegment } from '#/components/month-summary/summary-bar-segment.type.ts';
import { cx } from '#/utils/class-names.util.ts';

const TONE_CLASS: Record<SummaryBarSegment['tone'], string> = {
  brand: 'bg-brand',
  gain: 'bg-gain',
  muted: 'bg-(--color-chart-ghost)',
  strong: 'bg-fg-tertiary',
  loss: 'bg-loss',
};

type SummaryBarProps = {
  segments: SummaryBarSegment[];
  /** What the bar says in words ("Recebido: 45% do esperado"). */
  label: string;
};

/** Thin 4 px bar of a summary card: a track with painted stretches, read as an image by screen readers. */
export function SummaryBar({ segments, label }: SummaryBarProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-s4 w-full overflow-hidden rounded-capsule bg-track"
    >
      {segments.map((segment, index) => (
        <span
          key={index}
          className={cx('h-full', TONE_CLASS[segment.tone])}
          style={{ width: `${segment.percent}%` }}
        />
      ))}
    </div>
  );
}
