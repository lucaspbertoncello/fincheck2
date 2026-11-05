import { useId, useState } from 'react';
import { Button, Heading } from 'react-aria-components';

import { Collapse } from '#/components/disclosure/index.ts';
import { InlineNotice } from '#/components/feedback/inline-notice.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { HideValuesButton } from '#/components/money/hide-values-button.component.tsx';
import { Money } from '#/components/money/money.component.tsx';
import { BalanceComposition } from '#/components/summary/balance-composition.component.tsx';
import type { FreeBalanceData } from '#/components/summary/free-balance.type.ts';
import { PANEL_LABELS, PANEL_SURFACE } from '#/components/summary/panel-labels.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type CompactFreeBalanceProps = {
  data: FreeBalanceData;
  isHidden: boolean;
  onToggleHidden: () => void;
};

/** "Mini" panel for mobile screens other than the Visão geral: the balance, tap to open the equation. */
export function CompactFreeBalance({ data, isHidden, onToggleHidden }: CompactFreeBalanceProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <section aria-label={PANEL_LABELS.panel} className={cx(PANEL_SURFACE, 'p-s16')}>
      <>
        <div className="flex items-center justify-between gap-s8">
          <p className="text-meta text-fg-secondary">{PANEL_LABELS.panel}</p>
          <HideValuesButton isHidden={isHidden} onToggle={onToggleHidden} />
        </div>
        <Heading level={2} className="m-0">
          <Button
            aria-expanded={isOpen}
            aria-controls={panelId}
            onPress={() => setIsOpen((current) => !current)}
            className="flex min-h-ctl-touch w-full cursor-pointer items-center justify-between gap-s12 text-start outline-none"
          >
            <Money
              cents={data.balanceCents}
              currency="fixed"
              smallDots
              className="text-money-md tracking-(--letter-spacing-money-md) text-fg-primary"
            />
            <Icon
              name="chevron-down"
              size="md"
              className={cx(
                'text-fg-secondary transition-transform duration-(--duration-fast) ease-(--ease-standard)',
                isOpen && 'rotate-180',
              )}
            />
          </Button>
        </Heading>
        <Collapse isOpen={isOpen} id={panelId} contentClassName="pt-s8">
          <div className="flex flex-col gap-s12">
            {data.partialNote ? <InlineNotice>{data.partialNote}</InlineNotice> : null}
            <BalanceComposition data={data} />
          </div>
        </Collapse>
      </>
    </section>
  );
}
