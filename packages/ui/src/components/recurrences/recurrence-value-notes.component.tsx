import { Money } from '#/components/money/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type RecurrenceValueNotesProps = {
  /** Nothing came in yet: the main value is the expected one, so the line only says "previsto". */
  forecast?: boolean;
  /** The full expected amount ("≈ R$ 2.600,00 previstos"). */
  expectedCents?: number;
  /** Still missing, "faltam ≈ R$ 1.189,78". */
  remainingCents?: number;
  /** What came in above the expected amount, "R$ 300,00 a mais". */
  excessCents?: number;
  /**
   * "column" (from the desktop): one line each, under the main value, at the right end. "inline"
   * (the phone): the parts side by side on a strip as wide as the card, breaking only between them.
   */
  layout: 'column' | 'inline';
};

function Amount({ cents }: { cents: number }) {
  return <Money cents={cents} sign="none" weight="plain" className="text-meta" />;
}

/**
 * The reference lines of a `RecurrenceRow`, smaller and secondary: what is expected, what is
 * missing, what came in above. A part never breaks in the middle (a value is never split). The
 * caller renders it only when there is something to say.
 */
export function RecurrenceValueNotes({
  forecast = false,
  expectedCents,
  remainingCents,
  excessCents,
  layout,
}: RecurrenceValueNotesProps) {
  return (
    <span
      className={cx(
        'flex gap-y-s4 whitespace-nowrap',
        layout === 'column' ? 'flex-col items-end gap-s4' : 'flex-wrap gap-x-s12',
      )}
    >
      {expectedCents !== undefined ? (
        <span>
          ≈ <Amount cents={expectedCents} /> previstos
        </span>
      ) : null}
      {forecast ? <span>previsto</span> : null}
      {remainingCents ? (
        <span>
          faltam ≈ <Amount cents={remainingCents} />
        </span>
      ) : null}
      {excessCents ? (
        <span>
          <Amount cents={excessCents} /> a mais
        </span>
      ) : null}
    </span>
  );
}
