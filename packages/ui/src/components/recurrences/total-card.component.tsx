import { useId, useState } from 'react';
import { Button, Heading } from 'react-aria-components';
import { Collapse } from '#/components/disclosure/index.ts';

import { Icon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { TotalCardItem } from '#/components/recurrences/total-card.type.ts';

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
  /** Color of the values: "expense" for what goes out, "income" for what comes in. */
  tone?: 'inherit' | 'income' | 'expense';
  className?: string;
};

function Head({
  label,
  totalCents,
  caption,
  tone,
  expandable,
  isOpen = false,
}: TotalCardProps & { expandable: boolean; isOpen?: boolean }) {
  return (
    <>
      <span className="block text-label text-fg-secondary">{label}</span>
      <span className="mt-s4 flex items-center gap-s8">
        <Money cents={totalCents} sign="none" tone={tone} className="text-money-md" />
        {expandable ? (
          <Icon
            name="chevron-down"
            size="md"
            className={cx(
              'text-fg-secondary transition-transform duration-(--duration-fast)',
              isOpen && 'rotate-180',
            )}
          />
        ) : null}
      </span>
      {caption ? (
        <span className="mt-s8 block text-label whitespace-nowrap text-fg-secondary">
          {caption}
        </span>
      ) : null}
    </>
  );
}

/**
 * Total card (components.md 10.2, KPI): glass box with the value at 20 / 300. With `items`, the
 * whole head is a button that opens the composition (a `Collapse`, the chevron turns 180°) with a
 * rule between lines and the total in the footer.
 */
export function TotalCard({
  label,
  totalCents,
  caption,
  items,
  totalLabel = 'Total',
  tone,
  className,
}: TotalCardProps) {
  if (!items) {
    return (
      <div className={cx('glass p-s16 lg:px-s24', className)}>
        <Head
          label={label}
          totalCents={totalCents}
          caption={caption}
          tone={tone}
          expandable={false}
        />
      </div>
    );
  }

  return (
    <ExpandableTotalCard
      label={label}
      totalCents={totalCents}
      caption={caption}
      items={items}
      totalLabel={totalLabel}
      tone={tone}
      className={className}
    />
  );
}

function ExpandableTotalCard({
  label,
  totalCents,
  caption,
  items = [],
  totalLabel = 'Total',
  tone,
  className,
}: TotalCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={cx('glass p-s16 lg:px-s24', className)}>
      <Heading className="m-0">
        <Button
          aria-expanded={isOpen}
          aria-controls={panelId}
          onPress={() => setIsOpen((current) => !current)}
          className="focus-ring block min-h-ctl-touch w-full cursor-pointer rounded-input text-left"
        >
          <Head
            label={label}
            totalCents={totalCents}
            caption={caption}
            tone={tone}
            expandable
            isOpen={isOpen}
          />
        </Button>
      </Heading>
      <Collapse isOpen={isOpen} id={panelId} contentClassName="pt-s16">
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-s16 py-s12">
              <span className="min-w-0">
                <span className="block text-list text-fg-primary">{item.label}</span>
                {item.note ? (
                  <span className="block text-meta text-fg-secondary">{item.note}</span>
                ) : null}
              </span>
              <Money cents={item.cents} sign="none" weight="plain" tone={tone} />
            </li>
          ))}
        </ul>
        <p className="flex items-center justify-between gap-s16 border-t border-line pt-s12 text-meta text-fg-secondary">
          <span>{totalLabel}</span>
          <Money cents={totalCents} sign="none" weight="plain" tone={tone} />
        </p>
      </Collapse>
    </div>
  );
}
