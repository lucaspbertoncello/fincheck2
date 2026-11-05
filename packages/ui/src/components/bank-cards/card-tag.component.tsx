import { Chip } from '#/components/chips/chip.component.tsx';
import type { ChipTone } from '#/components/chips/chip.type.ts';

const CHIP_TONE: Record<'accent' | 'neutral' | 'income' | 'warn', ChipTone> = {
  accent: 'accent',
  neutral: 'neutral',
  income: 'ok',
  warn: 'warn',
};

type CardTagProps = {
  tone: keyof typeof CHIP_TONE;
  children: string;
};

/** Small status tag of the bank cards ("Fatura aberta", "Pluggy", "Manual"): a `Chip` of `chips/`. */
export function CardTag({ tone, children }: CardTagProps) {
  return (
    <Chip tone={CHIP_TONE[tone]} className="shrink-0">
      {children}
    </Chip>
  );
}
