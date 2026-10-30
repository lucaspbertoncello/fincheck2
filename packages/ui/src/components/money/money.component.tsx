import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';
import { cx } from '#/utils/class-names.util.ts';

const WEIGHT_CLASS = {
  light: 'font-numeric',
  plain: 'font-plain',
  emphasis: 'font-emphasis',
} as const;

const TONE_CLASS = {
  inherit: '',
  income: 'text-gain',
  faded: 'text-fg-tertiary',
} as const;

type MoneyProps = {
  /** Integer cents. A negative value shows "−" when `sign` is "auto". */
  cents: number;
  /** "plus" and "minus" force the sign; "auto" shows "−" only for negatives; "none" never shows one. */
  sign?: 'plus' | 'minus' | 'auto' | 'none';
  /** Reserves the 10 px sign column so signs line up in a list. */
  signColumn?: boolean;
  weight?: keyof typeof WEIGHT_CLASS;
  tone?: keyof typeof TONE_CLASS;
  /** "proportional" is 0.8 of the number; "fixed" is 20 px (the Livre hero). */
  currency?: 'proportional' | 'fixed';
  /** The hidden dots shrink to 0.64 of the number (the Livre hero). */
  smallDots?: boolean;
  /** False rounds to whole reais ("≈ R$ 585 por dia"). */
  showCents?: boolean;
  className?: string;
};

/**
 * The only way to write money: "R$" smaller and secondary, tabular digits, one sign column.
 * With the eye on, the value becomes "R$ ••••", the sign goes away and screen readers hear
 * "valor oculto" (BR-DSH-013).
 */
export function Money({
  cents,
  sign = 'auto',
  signColumn = false,
  weight = 'light',
  tone = 'inherit',
  currency = 'proportional',
  smallDots = false,
  showCents = true,
  className,
}: MoneyProps) {
  const hidden = useMoneyHidden();
  const signChar =
    sign === 'plus' ? '+' : sign === 'minus' ? '−' : sign === 'auto' && cents < 0 ? '−' : '';

  return (
    <span
      className={cx(
        'money-numeric inline-flex items-baseline gap-s4 whitespace-nowrap',
        WEIGHT_CLASS[weight],
        TONE_CLASS[tone],
        className,
      )}
    >
      {signColumn || (signChar && !hidden) ? (
        <span
          aria-hidden={hidden || !signChar || undefined}
          className={cx('text-end', signColumn && 'w-sign-col')}
        >
          {hidden ? '' : signChar}
        </span>
      ) : null}
      <span
        aria-hidden={hidden || undefined}
        className={cx(
          tone === 'income' ? 'text-gain' : 'text-fg-secondary',
          currency === 'fixed' ? 'text-money-sm' : 'money-currency-proportional',
        )}
      >
        R$
      </span>
      <span
        aria-hidden={hidden || undefined}
        className={cx(hidden && smallDots && 'money-dots-small')}
      >
        {hidden ? '••••' : formatMoneyParts(cents, showCents)}
      </span>
      {hidden ? <span className="sr-only">valor oculto</span> : null}
    </span>
  );
}
