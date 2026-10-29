import { formatMoney } from '#/shared/utils/format-money.util.ts';

type MoneyTextProps = {
  cents: number;
  className?: string;
};

export function MoneyText({ cents, className = '' }: MoneyTextProps) {
  return (
    <span className={`font-money font-numeric tabular-nums ${className}`.trim()}>
      {formatMoney(cents)}
    </span>
  );
}
