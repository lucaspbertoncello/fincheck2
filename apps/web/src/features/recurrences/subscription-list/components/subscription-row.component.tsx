import {
  Button,
  CategoryIcon,
  Chip,
  Collapse,
  Money,
  OverflowMenu,
  type ChipTone,
  type IconName,
  type OverflowMenuItem,
} from '@fincheck/ui';
import { Button as AriaButton } from 'react-aria-components';

import type { SubscriptionRowData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';

export type SubscriptionRowAction = 'open' | 'update-value' | 'end' | 'edit' | 'delete';

type SubscriptionRowProps = {
  row: SubscriptionRowData;
  /** The line above is the list's own rule: the first row of the list has none. */
  first: boolean;
  onAction: (row: SubscriptionRowData, action: SubscriptionRowAction) => void;
};

const STATUS_CHIP: Record<
  SubscriptionRowData['status'],
  { label: string; tone: ChipTone; icon: IconName }
> = {
  charged: { label: 'Cobrada', tone: 'ok', icon: 'check' },
  upcoming: { label: 'A cobrar', tone: 'neutral', icon: 'clock' },
  missed: { label: 'Não cobrou', tone: 'warn', icon: 'warning' },
};

function buildMenu(row: SubscriptionRowData): OverflowMenuItem[] {
  return [
    { key: 'edit', label: 'Editar', icon: 'edit' },
    ...(row.ended ? [] : [{ key: 'end', label: 'Encerrar', icon: 'clock' as const }]),
    { key: 'delete', label: 'Excluir', icon: 'trash', danger: true },
  ];
}

/**
 * A subscription of the month (BR-REC-017). The row rule of the app: icon at the left; the name and
 * one line of detail, with at most two chips under them; the amount always at the right edge, in two
 * lines (the amount, then when it was or will be charged); the warning and its button in a strip
 * under the text, aligned with it. The text opens the recurrence; the "…" ends or deletes it.
 */
export function SubscriptionRow({ row, first, onAction }: SubscriptionRowProps) {
  const chip = STATUS_CHIP[row.status];

  return (
    <div
      className={`${first ? '' : 'border-t border-line '}grid grid-cols-[auto_1fr_auto_auto] items-start gap-x-s12 py-s12 ${row.pending ? 'pointer-events-none opacity-50' : ''}`}
    >
      <CategoryIcon icon={row.icon} type="expense" />
      <AriaButton
        aria-label={`Abrir ${row.name}`}
        onPress={() => onAction(row, 'open')}
        className="focus-ring min-w-0 cursor-pointer rounded-input text-left"
      >
        <span className="block truncate text-body font-emphasis text-fg-primary">{row.name}</span>
        <span className="block truncate text-label text-fg-secondary">{row.detail}</span>
        <span className="mt-s8 flex flex-nowrap items-center gap-s8">
          <Chip tone={chip.tone} icon={chip.icon}>
            {chip.label}
          </Chip>
          {row.ended ? (
            <Chip icon="close" tone="neutral">
              Encerrada
            </Chip>
          ) : null}
        </span>
      </AriaButton>
      <OverflowMenu
        label={`Ações de ${row.name}`}
        items={buildMenu(row)}
        onAction={(key) => onAction(row, key as SubscriptionRowAction)}
        className="-mt-s4"
      />
      <span className="flex flex-col items-end gap-s4 whitespace-nowrap">
        <Money cents={row.amountCents} sign="minus" weight="plain" className="text-money-row" />
        <span className="text-meta text-fg-secondary">{row.statusNote}</span>
      </span>
      <Collapse
        isOpen={row.alert !== null}
        trackClassName="col-start-2 col-end-5"
        contentClassName="pt-s12"
      >
        {row.alert ? (
          <div className="rounded-panel bg-caution-weak px-s12 py-s12">
            <p className="text-label text-fg-primary">{row.alert.text}</p>
            {row.alert.actionLabel ? (
              <div className="mt-s8 flex items-center gap-s8">
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    onAction(row, row.alert?.kind === 'missed' ? 'end' : 'update-value')
                  }
                >
                  {row.alert.actionLabel}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Collapse>
    </div>
  );
}
