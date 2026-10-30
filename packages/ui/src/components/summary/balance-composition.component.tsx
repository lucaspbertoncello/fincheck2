import { Button, Disclosure, DisclosurePanel, Heading } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { Money } from '#/components/money/money.component.tsx';
import type { FreeBalanceLine } from '#/components/summary/free-balance.type.ts';

const MARKER = {
  balance: 'bg-brand',
  receivable: 'bg-(--color-accent-highlight)',
  payable: 'bg-(--color-chart-pie-other)',
} as const;

type BalanceCompositionProps = {
  lines: FreeBalanceLine[];
};

/**
 * The three lines that make up the Livre. Each one opens its items. Rows align by the top of the
 * value with 12 px of vertical padding, and the subtitle is 13 px, at most two lines (ui adjustment 7).
 */
export function BalanceComposition({ lines }: BalanceCompositionProps) {
  return (
    <div className="flex flex-col">
      {lines.map((line) => (
        <Disclosure key={line.key} className="group -mx-s8">
          <Heading level={3} className="m-0">
            <Button
              slot="trigger"
              className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-x-s12 rounded-input px-s8 py-s12 text-start outline-none transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle"
            >
              <span
                aria-hidden="true"
                className={`mt-s8 size-s8 rounded-capsule ${MARKER[line.key]}`}
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-list text-fg-primary">{line.label}</span>
                {line.subtitle ? (
                  <span className="line-clamp-2 text-meta text-fg-secondary">{line.subtitle}</span>
                ) : null}
              </span>
              <Money cents={line.cents} sign={line.sign} signColumn className="text-money-row" />
              <Icon
                name="chevron-right"
                size="sm"
                className="mt-s4 text-fg-secondary transition-transform duration-(--duration-fast) ease-(--ease-standard) group-data-[expanded]:rotate-90"
              />
            </Button>
          </Heading>
          <DisclosurePanel>
            <ul className="flex flex-col gap-s8 px-s8 pb-s12 pl-7">
              {line.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-s12 text-label text-fg-secondary"
                >
                  <span className="flex min-w-0 items-baseline gap-s8">
                    <span className="min-w-0 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="shrink-0 rounded-capsule bg-subtle px-s8 text-meta text-fg-secondary">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  <Money cents={item.cents} sign="none" weight="plain" />
                </li>
              ))}
            </ul>
          </DisclosurePanel>
        </Disclosure>
      ))}
    </div>
  );
}
