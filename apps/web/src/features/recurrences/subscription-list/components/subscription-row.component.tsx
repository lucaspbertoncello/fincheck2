import {
  Button,
  CategoryIcon,
  Chip,
  Icon,
  ListRow,
  Money,
  OverflowMenu,
  ServiceLogo,
  type ChipTone,
  type IconName,
  type OverflowMenuItem,
} from '@fincheck/ui';

import type { SubscriptionRowAction } from '#/features/recurrences/subscription-list/types/subscription-row-action.type.ts';
import type { SubscriptionRowData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';

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
 * A subscription of the month (BR-REC-017) on the standard list row, the same as the recurrences:
 * icon, the name (it opens the recurrence) with the state of the month as the badge (and "Encerrada"),
 * the card and the day as the detail, the amount at the right end over when it was or will be
 * charged, the "…" menu, and the warning with its button on the strip, in the "Precisa de você" tone.
 */
export function SubscriptionRow({ row, first, onAction }: SubscriptionRowProps) {
  const chip = STATUS_CHIP[row.status];
  const statusChip = (
    <Chip key="status" tone={chip.tone} icon={chip.icon}>
      {chip.label}
    </Chip>
  );
  const classes = [
    first ? null : 'border-t border-line',
    row.pending ? 'pointer-events-none opacity-50' : null,
  ].filter(Boolean);

  return (
    <ListRow
      mark={
        row.service ? (
          <ServiceLogo slug={row.service.slug} name={row.service.name} />
        ) : (
          <CategoryIcon icon={row.icon} type="expense" />
        )
      }
      name={row.name}
      onOpen={() => onAction(row, 'open')}
      openLabel={`Abrir ${row.name}`}
      badges={
        row.ended
          ? [
              statusChip,
              <Chip key="ended" icon="close" tone="neutral">
                Encerrada
              </Chip>,
            ]
          : [statusChip]
      }
      detail={row.detail}
      detailTitle={row.detail}
      value={
        <Money
          cents={row.amountCents}
          sign="minus"
          signColumn
          weight="plain"
          className="text-money-row"
        />
      }
      valueNote={row.statusNote}
      menu={
        <OverflowMenu
          label={`Ações de ${row.name}`}
          items={buildMenu(row)}
          onAction={(key) => onAction(row, key as SubscriptionRowAction)}
        />
      }
      actions={
        row.alert ? (
          <div className="flex w-full flex-col items-start gap-s8 rounded-input border border-caution/20 bg-caution-weak/45 px-s12 py-s12">
            <p className="flex min-w-0 items-start gap-s8 text-label text-fg-primary">
              <Icon name="warning" size="sm" className="mt-s4 shrink-0 text-caution" />
              {row.alert.text}
            </p>
            {row.alert.actionLabel ? (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => onAction(row, row.alert?.kind === 'missed' ? 'end' : 'update-value')}
              >
                {row.alert.actionLabel}
              </Button>
            ) : null}
          </div>
        ) : null
      }
      actionsOpen={row.alert !== null}
      as="div"
      className={classes.join(' ') || undefined}
    />
  );
}
