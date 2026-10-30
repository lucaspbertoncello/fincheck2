import { buildBalanceCurve } from '#/components/bank-cards/balance-curve.util.ts';

type BalanceCurveProps = {
  /** Balance at the end of each day of the month, in cents. */
  values: readonly number[];
  /** Text alternative ("Saldo do mês: de R$ 3.100,00 a R$ 3.412,58"). */
  label: string;
};

/** Month curve of an account card: 48 px tall, line, soft area and a dot at today. */
export function BalanceCurve({ values, label }: BalanceCurveProps) {
  const curve = buildBalanceCurve(values);
  return (
    <div role="img" aria-label={label} className="relative h-12 w-full">
      {curve ? (
        <>
          <svg
            viewBox="0 0 100 48"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-0 size-full overflow-visible"
          >
            <path d={curve.area} className="fill-brand-weak" />
            <path
              d={curve.line}
              fill="none"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-brand"
            />
          </svg>
          <span
            aria-hidden="true"
            className="absolute right-0 size-s8 translate-x-1/2 -translate-y-1/2 rounded-capsule bg-brand"
            style={{ top: `${curve.endY}%` }}
          />
        </>
      ) : null}
    </div>
  );
}
