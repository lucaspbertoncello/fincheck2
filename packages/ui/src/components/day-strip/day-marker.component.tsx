import type { DayMarkerFlow, DayMarkerStatus } from '#/components/day-strip/day-strip.type.ts';
import { cx } from '#/utils/class-names.util.ts';

const FLOW_CLASS = {
  income: { fill: 'bg-gain', ring: 'border-gain', half: 'from-gain' },
  expense: { fill: 'bg-loss', ring: 'border-loss', half: 'from-loss' },
  /** The legend explains shapes in a neutral tone. */
  neutral: { fill: 'bg-fg-secondary', ring: 'border-fg-secondary', half: 'from-fg-secondary' },
} as const;

type DayMarkerDotProps = {
  flow: DayMarkerFlow | 'neutral';
  status: DayMarkerStatus;
};

/** The 10 px marker of one occurrence: filled, hollow, half, amber with halo or plain amber. */
export function DayMarkerDot({ flow, status }: DayMarkerDotProps) {
  const color = FLOW_CLASS[flow];

  return (
    <span
      aria-hidden="true"
      className={cx(
        'box-border block size-2.5 shrink-0 rounded-capsule border-2',
        status === 'happened' && cx(color.fill, color.ring),
        status === 'expected' && cx(color.ring, 'bg-transparent'),
        status === 'partial' &&
          cx(color.ring, 'bg-linear-to-r from-50% to-transparent to-50%', color.half),
        status === 'late' && 'border-caution bg-caution ring-2 ring-caution-weak',
        status === 'different' && 'border-caution bg-caution',
      )}
    />
  );
}
