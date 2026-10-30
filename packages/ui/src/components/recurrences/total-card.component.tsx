import { Button, Disclosure, DisclosurePanel, Heading } from 'react-aria-components';

import { Icon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import { cx } from '#/utils/class-names.util.ts';

export type TotalCardItem = {
  key: string;
  label: string;
  /** Under the label: "vence 25/10". */
  note?: string;
  cents: number;
};

type TotalCardProps = {
  /** "A pagar", "Receitas esperadas em outubro". */
  label: string;
  /** The total, in integer cents. */
  totalCents: number;
  /** Line under the value: "7 contas, até 31/10 e faturas abertas". */
  caption?: string;
  /** With items the card opens the composition; without them it is a plain summary card. */
  items?: readonly TotalCardItem[];
  /** Label of the composition footer. */
  totalLabel?: string;
  className?: string;
};

function Head({
  label,
  totalCents,
  caption,
  expandable,
}: TotalCardProps & { expandable: boolean }) {
  return (
    <>
      <span className="block text-label text-fg-secondary">{label}</span>
      <span className="mt-s4 flex items-center gap-s8">
        <Money cents={totalCents} sign="none" className="text-money-md" />
        {expandable ? (
          <Icon
            name="chevron-down"
            size="md"
            className="text-fg-secondary transition-transform duration-(--duration-fast) group-data-[expanded]:rotate-180"
          />
        ) : null}
      </span>
      {caption ? <span className="mt-s8 block text-label text-fg-secondary">{caption}</span> : null}
    </>
  );
}

/**
 * Total card (components.md 10.2, KPI): glass box with the value at 20 / 300. With `items`, the
 * whole head is a button that opens the composition (a React Aria disclosure, the chevron turns
 * 180°) with a rule between lines and the total in the footer.
 */
export function TotalCard({
  label,
  totalCents,
  caption,
  items,
  totalLabel = 'Total',
  className,
}: TotalCardProps) {
  if (!items) {
    return (
      <div className={cx('glass p-s16 lg:px-s24', className)}>
        <Head label={label} totalCents={totalCents} caption={caption} expandable={false} />
      </div>
    );
  }

  return (
    <Disclosure className={cx('group glass p-s16 lg:px-s24', className)}>
      <Heading className="m-0">
        <Button
          slot="trigger"
          className="focus-ring block min-h-ctl-touch w-full cursor-pointer rounded-input text-left"
        >
          <Head label={label} totalCents={totalCents} caption={caption} expandable />
        </Button>
      </Heading>
      <DisclosurePanel>
        <ul className="mt-s16 flex flex-col divide-y divide-line border-t border-line">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-s16 py-s12">
              <span className="min-w-0">
                <span className="block text-list text-fg-primary">{item.label}</span>
                {item.note ? (
                  <span className="block text-meta text-fg-secondary">{item.note}</span>
                ) : null}
              </span>
              <Money cents={item.cents} sign="none" weight="plain" />
            </li>
          ))}
        </ul>
        <p className="flex items-center justify-between gap-s16 border-t border-line pt-s12 text-meta text-fg-secondary">
          <span>{totalLabel}</span>
          <Money cents={totalCents} sign="none" weight="plain" />
        </p>
      </DisclosurePanel>
    </Disclosure>
  );
}
