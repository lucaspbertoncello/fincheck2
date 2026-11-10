import { useId, useState } from 'react';
import { Button, Heading, Link } from 'react-aria-components';
import { Collapse } from '#/components/disclosure/index.ts';

import { Icon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { TotalCardDetail, TotalCardItem } from '#/components/recurrences/total-card.type.ts';

type TotalCardBase = {
  /** "A pagar", "Receitas esperadas em outubro". */
  label: string;
  /** The total, in integer cents. */
  totalCents: number;
  /** Line under the value: "7 contas, até 31/10 e faturas abertas". */
  caption?: string;
  /** Label of the composition footer. */
  totalLabel?: string;
  /** Color of the values: "expense" for what goes out, "income" for what comes in. */
  tone?: 'inherit' | 'income' | 'expense';
  className?: string;
};

/**
 * Either the card opens a composition (`items`) or it carries lines under the value (`details`):
 * never both. The head of a card with `items` is one button, and a link cannot live inside it.
 */
type TotalCardProps = TotalCardBase &
  (
    | {
        /** With items the card opens the composition; without them it is a plain summary card. */
        items: readonly TotalCardItem[];
        details?: never;
      }
    | {
        items?: undefined;
        /** Lines under the value, each plain text or a link ("R$ 3.387,22 já recebidos ›"). */
        details?: readonly TotalCardDetail[];
      }
  );

function Head({
  label,
  totalCents,
  caption,
  tone,
  expandable,
  isOpen = false,
}: TotalCardBase & { expandable: boolean; isOpen?: boolean }) {
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

/** A line of `details`: a link gets the pointer, an underline on hover and on keyboard focus, and a "›". */
function Detail({ text, href, srHint }: Omit<TotalCardDetail, 'key'>) {
  if (!href) return <span className="block text-label whitespace-nowrap">{text}</span>;

  return (
    <Link
      href={href}
      // 44 px tall on a phone (the line is short), the height of the text from lg.
      className="focus-ring -mx-s4 inline-flex min-h-11 w-fit cursor-pointer items-center gap-s4 rounded-input px-s4 text-label whitespace-nowrap no-underline underline-offset-4 data-[focus-visible]:underline data-[hovered]:underline lg:min-h-0"
    >
      {text}
      {srHint ? <span className="sr-only">, {srHint}</span> : null}
      <Icon name="chevron-right" size="sm" />
    </Link>
  );
}

/**
 * Total card (components.md 10.2, KPI): glass box with the value at 20 / 300. With `items`, the
 * whole head is a button that opens the composition (a `Collapse`, the chevron turns 180°) with a
 * rule between lines and the total in the footer. With `details` (and no `items`) the card is a
 * plain one with lines under the value, each text or a link to where the number comes from.
 */
export function TotalCard({
  label,
  totalCents,
  caption,
  details,
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
        {details && details.length > 0 ? (
          <ul className="mt-s8 flex flex-col items-start gap-s4 text-fg-secondary">
            {details.map((detail) => (
              <li key={detail.key}>
                <Detail text={detail.text} href={detail.href} srHint={detail.srHint} />
              </li>
            ))}
          </ul>
        ) : null}
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
  items,
  totalLabel = 'Total',
  tone,
  className,
}: TotalCardBase & { items: readonly TotalCardItem[] }) {
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
                {item.href ? (
                  <Link
                    href={item.href}
                    // Padding grows the tap area without moving the line (the negative margin takes it back).
                    className="focus-ring -mx-s4 -my-s4 flex w-fit cursor-pointer items-center rounded-input px-s4 py-s4 text-list text-fg-primary no-underline underline-offset-4 data-[focus-visible]:underline data-[hovered]:underline"
                  >
                    {item.label}
                    {item.srHint ? <span className="sr-only">, {item.srHint}</span> : null}
                  </Link>
                ) : (
                  <span className="block text-list text-fg-primary">{item.label}</span>
                )}
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
