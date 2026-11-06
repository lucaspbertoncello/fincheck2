import { useId, useState } from 'react';
import { Button, Heading } from 'react-aria-components';

import { Collapse } from '#/components/disclosure/index.ts';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { Money } from '#/components/money/money.component.tsx';
import type { FreeBalanceData, FreeBalanceLine } from '#/components/summary/free-balance.type.ts';
import { PANEL_LABELS } from '#/components/summary/panel-labels.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

const LINE_TONE = { receivable: 'income', payable: 'expense' } as const satisfies Record<
  FreeBalanceLine['key'],
  'income' | 'expense'
>;

const LINE_ICON: Record<FreeBalanceLine['key'], { icon: IconName; tone: string }> = {
  receivable: { icon: 'hand-money', tone: 'bg-gain-weak text-gain' },
  payable: { icon: 'receipt', tone: 'bg-subtle text-fg-secondary' },
};

/** Items shown inside an open line; the rest becomes "e mais N" so the panel never outgrows the window. */
const MAX_ITEMS = 4;

const ROW =
  'grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-s12 py-s8 [@media(max-height:700px)]:py-s4';

function RowIcon({ icon, tone }: { icon: IconName; tone: string }) {
  return (
    <span aria-hidden="true" className={cx('grid size-8 place-items-center rounded-capsule', tone)}>
      <Icon name={icon} size="md" />
    </span>
  );
}

function LineRow({
  line,
  isOpen,
  onToggle,
}: {
  line: FreeBalanceLine;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const { icon, tone } = LINE_ICON[line.key];
  const shown = line.items.slice(0, MAX_ITEMS);
  const rest = line.items.length - shown.length;

  return (
    <div className="-mx-s8">
      <Heading level={3} className="m-0">
        <Button
          aria-expanded={isOpen}
          aria-controls={panelId}
          onPress={onToggle}
          className="w-full cursor-pointer rounded-input px-s8 text-start outline-none transition-colors duration-(--duration-fast) data-[focus-visible]:outline-2 data-[focus-visible]:outline-brand data-[hovered]:bg-subtle"
        >
          <span className={ROW}>
            <RowIcon icon={icon} tone={tone} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-emphasis text-fg-primary">{line.label}</span>
              {line.subtitle ? (
                <span className="truncate text-label text-fg-secondary" title={line.subtitle}>
                  {line.subtitle}
                </span>
              ) : null}
            </span>
            <span className="flex items-center gap-s4">
              <Money
                cents={line.cents}
                sign={line.sign}
                signColumn
                tone={LINE_TONE[line.key]}
                className="text-money-row"
              />
              <Icon
                name="chevron-right"
                size="sm"
                className={cx(
                  'text-fg-secondary transition-transform duration-(--duration-fast) ease-(--ease-standard)',
                  isOpen && 'rotate-90',
                )}
              />
            </span>
          </span>
        </Button>
      </Heading>
      <Collapse isOpen={isOpen} id={panelId}>
        <ul className="flex flex-col gap-s4 pr-s8 pb-s8 pl-[3.25rem]">
          {shown.map((item) => (
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
              <Money cents={item.cents} sign="none" weight="plain" tone={LINE_TONE[line.key]} />
            </li>
          ))}
          {rest > 0 ? <li className="text-meta text-fg-secondary">e mais {rest}</li> : null}
        </ul>
      </Collapse>
    </div>
  );
}

type BalanceCompositionProps = {
  data: FreeBalanceData;
};

/**
 * The panel read as a sum: the balance above, then "A receber" (+), "A pagar" (−) and, closing,
 * "Sobra no fim do mês" (the label on its own line, the per-day amount and the result below it). The first two open their items, one at a time;
 * the closing line is not a toggle, it is the result of the lines above it.
 */
export function BalanceComposition({ data }: BalanceCompositionProps) {
  const [openKey, setOpenKey] = useState<FreeBalanceLine['key'] | null>(null);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col">
        {data.lines.map((line) => (
          <LineRow
            key={line.key}
            line={line}
            isOpen={openKey === line.key}
            onToggle={() => setOpenKey((current) => (current === line.key ? null : line.key))}
          />
        ))}
      </div>
      <div
        className={cx(
          'mt-s4 grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-s12 border-t border-line pt-s12',
          '[@media(max-height:700px)]:pt-s8',
        )}
      >
        <span className="row-span-2">
          <RowIcon icon="coins" tone="bg-brand-weak text-brand" />
        </span>
        <span className="col-span-2 text-body font-emphasis whitespace-nowrap text-fg-primary">
          {PANEL_LABELS.leftover}
        </span>
        <span className="text-label whitespace-nowrap text-fg-secondary">
          ≈{' '}
          <Money
            cents={data.perDayCents}
            sign="none"
            showCents={false}
            weight="emphasis"
            className="text-fg-primary"
          />{' '}
          {data.windowDays === 1 ? 'hoje' : 'por dia'}
        </span>
        <Money
          cents={data.freeCents}
          sign="none"
          weight="emphasis"
          className="text-money-row whitespace-nowrap text-fg-primary"
        />
      </div>
    </div>
  );
}
