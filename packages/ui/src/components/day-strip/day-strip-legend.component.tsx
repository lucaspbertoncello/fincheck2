import { DayMarkerDot } from '#/components/day-strip/day-marker.component.tsx';
import type { DayMarkerStatus } from '#/components/day-strip/day-strip.type.ts';

const FLOWS = [
  { flow: 'income', label: 'Receita', swatch: 'bg-gain' },
  { flow: 'expense', label: 'Despesa', swatch: 'bg-loss' },
] as const;

const STATUSES: readonly { status: DayMarkerStatus; label: string }[] = [
  { status: 'happened', label: 'Aconteceu' },
  { status: 'expected', label: 'Esperado' },
  { status: 'late', label: 'Atrasado' },
  { status: 'partial', label: 'Parcial' },
];

/** Legend above the "dia a dia" strip: what the color and the shape of a marker mean. */
export function DayStripLegend() {
  return (
    <ul
      aria-label="Legenda"
      className="flex flex-wrap items-center gap-x-s16 gap-y-s8 text-meta text-fg-secondary"
    >
      {FLOWS.map(({ flow, label, swatch }) => (
        <li key={flow} className="flex items-center gap-s8">
          <span aria-hidden="true" className={`block size-2.5 rounded-capsule ${swatch}`} />
          {label}
        </li>
      ))}
      <li aria-hidden="true" className="h-s16 w-px bg-(--color-border-default)" />
      {STATUSES.map(({ status, label }) => (
        <li key={status} className="flex items-center gap-s8">
          <DayMarkerDot flow="neutral" status={status} />
          {label}
        </li>
      ))}
    </ul>
  );
}
