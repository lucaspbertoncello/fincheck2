import { HideValuesButton } from '#/components/money/hide-values-button.component.tsx';
import { Money } from '#/components/money/money.component.tsx';
import { DayBar } from '#/components/summary/day-bar.component.tsx';
import type { FreeBalanceData } from '#/components/summary/free-balance.type.ts';
import { StaleChip } from '#/components/summary/stale-chip.component.tsx';

type FreeBalanceHeroProps = {
  data: FreeBalanceData;
  isHidden: boolean;
  onToggleHidden: () => void;
};

/** Top of the panel: label with the eye, the Livre value, per-day line, bar of days, stale chip. */
export function FreeBalanceHero({ data, isHidden, onToggleHidden }: FreeBalanceHeroProps) {
  return (
    <div className="flex flex-col gap-s16">
      <div className="flex flex-col gap-s8">
        <div className="flex items-center justify-between gap-s8">
          <p className="text-label text-fg-secondary">Livre até o fim do mês</p>
          <HideValuesButton isHidden={isHidden} onToggle={onToggleHidden} />
        </div>
        <Money
          cents={data.freeCents}
          currency="fixed"
          smallDots
          className="text-hero-mobile leading-(--line-height-tight) tracking-(--letter-spacing-hero) text-fg-primary lg:text-hero"
        />
        <p className="text-list text-fg-secondary">
          ≈{' '}
          <Money
            cents={data.perDayCents}
            sign="none"
            showCents={false}
            weight="emphasis"
            className="text-fg-primary"
          />{' '}
          {data.windowDays === 1 ? 'por dia hoje' : `por dia nos próximos ${data.windowDays} dias`}
        </p>
      </div>
      <DayBar
        total={data.windowDays}
        elapsed={data.elapsedDays}
        caption={`${data.windowDays} ${data.windowDays === 1 ? 'dia' : 'dias'} até o fim do mês`}
      />
      {data.staleNote ? <StaleChip>{data.staleNote}</StaleChip> : null}
    </div>
  );
}
