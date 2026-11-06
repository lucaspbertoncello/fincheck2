import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';
import { MaskedNumber } from '#/components/money/masked-number.component.tsx';
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
  expense: 'text-loss',
  faded: 'text-fg-tertiary',
} as const;

type MoneyProps = {
  /** Integer cents. A negative value shows "−" when `sign` is "auto". */
  cents: number;
  /**
   * "plus" and "minus" force the sign; "auto" shows "−" only for negatives; "none" shows none. With
   * the `income` or `expense` tone the flow sign always shows ("+" green, "−" red), whatever this is.
   */
  sign?: 'plus' | 'minus' | 'auto' | 'none';
  /** Reserves the 10 px sign column so signs line up in a list. */
  signColumn?: boolean;
  weight?: keyof typeof WEIGHT_CLASS;
  tone?: keyof typeof TONE_CLASS;
  /**
   * "proportional" is 0.8 of the number; "fixed" is 20 px (the Livre hero); "inline" is money inside
   * a sentence or a button label: "R$" with the size and color of the text around it, one piece.
   */
  currency?: 'proportional' | 'fixed' | 'inline';
  /** The hidden dots shrink to 0.64 of the number (the Livre hero). */
  smallDots?: boolean;
  /** False rounds to whole reais ("≈ R$ 585 por dia"). */
  showCents?: boolean;
  className?: string;
};

/**
 * The only way to write money: "R$" smaller and secondary, tabular digits, one sign column.
 * With the eye on, the digits become dots (`MaskedNumber`), the sign turns invisible and screen
 * readers hear "valor oculto" (BR-DSH-013). The box keeps the exact width of the real value, so
 * nothing around it changes size or moves when the eye toggles.
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
  const shape = formatMoneyParts(cents, showCents);
  // A flow color always comes with its sign (Lucas, 06/11/2026): red is "−", green is "+".
  const flowSign = tone === 'expense' ? '−' : tone === 'income' ? '+' : '';
  const signChar =
    sign === 'plus'
      ? '+'
      : sign === 'minus'
        ? '−'
        : flowSign || (sign === 'auto' && cents < 0 ? '−' : '');

  return (
    <span
      className={cx(
        'money-numeric inline-flex items-baseline gap-s4 whitespace-nowrap',
        WEIGHT_CLASS[weight],
        TONE_CLASS[tone],
        className,
      )}
    >
      {signColumn || signChar ? (
        <span
          aria-hidden={hidden || !signChar || undefined}
          className={cx('text-end', signColumn && 'w-sign-col', hidden && 'invisible')}
        >
          {hidden ? (signChar ? '+' : '') : signChar}
        </span>
      ) : null}
      <span
        aria-hidden={hidden || undefined}
        className={
          currency === 'inline'
            ? undefined
            : cx(
                tone === 'income' || tone === 'expense' ? TONE_CLASS[tone] : 'text-fg-secondary',
                currency === 'fixed' ? 'text-money-sm' : 'money-currency-proportional',
              )
        }
      >
        R$
      </span>
      {hidden ? <MaskedNumber shape={shape} smallDots={smallDots} /> : <span>{shape}</span>}
      {hidden ? <span className="sr-only">valor oculto</span> : null}
    </span>
  );
}
