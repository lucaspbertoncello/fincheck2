import { cx } from '#/utils/class-names.util.ts';

type MaskedNumberProps = {
  /** The number as it would be written, "1.234,56". Only its shape is used: no real digit is rendered. */
  shape: string;
  /** Hidden dots at 0.64 of the number (the Livre hero). */
  smallDots?: boolean;
};

/** Fewer than this many digits still show this many dots, so "••••" reads as hidden. */
const MIN_DOTS = 4;

/**
 * The number with the eye on. The box holds the shape of the number written with zeros, which
 * are invisible: tabular figures make a zero as wide as any digit, so the box has the exact
 * width of the real number and nothing around it changes size or moves when the eye toggles.
 * One dot per digit is centered over the box. The real digits never reach the DOM. Needs the
 * tabular figures of `money-numeric` on an ancestor.
 */
export function MaskedNumber({ shape, smallDots = false }: MaskedNumberProps) {
  const digits = shape.replace(/\D/g, '').length;

  return (
    <span aria-hidden="true" className="relative inline-block" data-masked-number>
      <span className="invisible whitespace-pre">{shape.replace(/\d/g, '0')}</span>
      <span
        className={cx(
          'absolute inset-0 flex items-center justify-center tracking-widest whitespace-nowrap',
          smallDots && 'money-dots-small',
        )}
      >
        {'•'.repeat(Math.max(digits, MIN_DOTS))}
      </span>
    </span>
  );
}
