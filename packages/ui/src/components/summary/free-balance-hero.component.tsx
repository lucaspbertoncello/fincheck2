import { HideValuesButton } from '#/components/money/hide-values-button.component.tsx';
import { Money } from '#/components/money/money.component.tsx';
import { PANEL_LABELS } from '#/components/summary/panel-labels.constant.ts';

type FreeBalanceHeroProps = {
  cents: number;
  isHidden: boolean;
  onToggleHidden: () => void;
};

/**
 * Top of the panel: the label with the eye and the big number. The number scales with the width of
 * the panel (container query) so "R$ 100.000,00" still fits in the 344 px column: 48 px at most,
 * 34 px at least.
 */
export function FreeBalanceHero({ cents, isHidden, onToggleHidden }: FreeBalanceHeroProps) {
  return (
    <div className="@container flex flex-col gap-s4">
      <div className="flex items-center justify-between gap-s8">
        <p className="text-label text-fg-secondary">{PANEL_LABELS.panel}</p>
        <HideValuesButton isHidden={isHidden} onToggle={onToggleHidden} />
      </div>
      <Money
        cents={cents}
        currency="fixed"
        smallDots
        className="text-[length:clamp(34px,calc((100cqi-32px)/5.6),48px)] leading-(--line-height-tight) tracking-(--letter-spacing-hero) text-fg-primary"
      />
    </div>
  );
}
