import { Money } from '#/components/money/money.component.tsx';

type SignedMoneyProps = {
  /** Signed integer cents: zero or more shows "+", less than zero shows "−". */
  cents: number;
  tone?: 'inherit' | 'income';
  className?: string;
};

/** Money that always carries its sign ("+R$ 313,45", "−R$ 40,00"), for deltas and results. */
export function SignedMoney({ cents, tone = 'inherit', className }: SignedMoneyProps) {
  return (
    <Money
      cents={Math.abs(cents)}
      sign={cents < 0 ? 'minus' : 'plus'}
      weight="plain"
      tone={tone}
      className={className}
    />
  );
}
