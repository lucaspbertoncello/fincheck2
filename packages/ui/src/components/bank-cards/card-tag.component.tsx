import { Chip, type ChipTone } from '#/components/chips/chip.component.tsx';

const CHIP_TONE: Record<'accent' | 'neutral' | 'income', ChipTone> = {
  accent: 'accent',
  neutral: 'neutral',
  income: 'ok',
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
