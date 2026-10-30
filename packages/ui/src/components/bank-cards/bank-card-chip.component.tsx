import { BANK_CHIP_COLORS } from '#/components/bank-cards/bank-card-chip.constant.ts';
import type { BankChipFinish } from '#/components/bank-cards/bank-theme.type.ts';

type BankCardChipProps = {
  finish: BankChipFinish;
};

/** EMV chip, 13 cqw wide, with the contact lines (components.md 3.3). */
export function BankCardChip({ finish }: BankCardChipProps) {
  const c = BANK_CHIP_COLORS[finish];
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: '13cqw',
        aspectRatio: '1.3',
        borderRadius: '2cqw',
        boxShadow: `0 0 0 0.3cqw ${c.edge} inset`,
        background: `linear-gradient(90deg,transparent 32%,${c.line} 33% 34%,transparent 35% 65%,${c.line} 66% 67%,transparent 68%),linear-gradient(0deg,transparent 48%,${c.line} 49% 51%,transparent 52%),linear-gradient(135deg,${c.from},${c.mid} 55%,${c.to})`,
      }}
    />
  );
}
