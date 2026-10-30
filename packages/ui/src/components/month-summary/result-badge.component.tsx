import { Money } from '#/components/money/money.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type ResultBadgeProps = {
  /** Result now minus the result of the previous month at the same point, in cents. */
  deltaCents: number;
};

/** Badge of the "Resultado do mês" card: triangle and the money difference ("▲ R$ 112"). */
export function ResultBadge({ deltaCents }: ResultBadgeProps) {
  const rising = deltaCents >= 0;

  return (
    <span
      className={cx(
        'inline-flex items-center gap-s4 rounded-capsule px-s8 py-s4 text-meta font-emphasis whitespace-nowrap tabular-nums',
        rising ? 'bg-gain-weak text-gain' : 'bg-loss-weak text-loss',
      )}
    >
      <span aria-hidden="true" className="text-caption">
        {rising ? '▲' : '▼'}
      </span>
      <span className="sr-only">{rising ? 'Acima de ' : 'Abaixo de '}</span>
      <Money
        cents={Math.abs(deltaCents)}
        sign="none"
        weight="emphasis"
        showCents={false}
        tone={rising ? 'income' : 'inherit'}
        className="text-meta"
      />
    </span>
  );
}
