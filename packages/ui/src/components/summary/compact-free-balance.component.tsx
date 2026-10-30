import { Button, Disclosure, DisclosurePanel, Heading } from 'react-aria-components';

import { InlineNotice } from '#/components/feedback/inline-notice.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { HideValuesButton } from '#/components/money/hide-values-button.component.tsx';
import { Money } from '#/components/money/money.component.tsx';
import { BalanceComposition } from '#/components/summary/balance-composition.component.tsx';
import type { FreeBalanceData } from '#/components/summary/free-balance.type.ts';
import { ReviewLink } from '#/components/summary/review-link.component.tsx';

type CompactFreeBalanceProps = {
  data: FreeBalanceData;
  isHidden: boolean;
  onToggleHidden: () => void;
};

/** "Mini Livre" for mobile screens other than the Visão geral: value and per day, tap to open the composition. */
export function CompactFreeBalance({ data, isHidden, onToggleHidden }: CompactFreeBalanceProps) {
  return (
    <section aria-label="Livre até o fim do mês" className="glass p-s16">
      <Disclosure className="group">
        <div className="flex items-center justify-between gap-s8">
          <p className="text-meta text-fg-secondary">Livre até o fim do mês</p>
          <HideValuesButton isHidden={isHidden} onToggle={onToggleHidden} />
        </div>
        <Heading level={2} className="m-0">
          <Button
            slot="trigger"
            className="flex min-h-ctl-touch w-full cursor-pointer items-center gap-s12 text-start outline-none"
          >
            <Money
              cents={data.freeCents}
              currency="fixed"
              smallDots
              className="text-money-md tracking-(--letter-spacing-money-md) text-fg-primary"
            />
            <span className="min-w-0 flex-1 text-meta text-fg-secondary">
              ≈{' '}
              <Money
                cents={data.perDayCents}
                sign="none"
                showCents={false}
                weight="emphasis"
                className="text-fg-primary"
              />
              /dia
            </span>
            <Icon
              name="chevron-down"
              size="md"
              className="text-fg-secondary transition-transform duration-(--duration-fast) ease-(--ease-standard) group-data-[expanded]:rotate-180"
            />
          </Button>
        </Heading>
        <DisclosurePanel>
          <div className="flex flex-col gap-s12 pt-s8">
            {data.partialNote ? <InlineNotice>{data.partialNote}</InlineNotice> : null}
            <BalanceComposition lines={data.lines} />
            {data.review ? <ReviewLink {...data.review} /> : null}
          </div>
        </DisclosurePanel>
      </Disclosure>
    </section>
  );
}
