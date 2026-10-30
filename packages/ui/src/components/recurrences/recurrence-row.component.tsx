import { Button } from '#/components/buttons/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import { OverflowMenu } from '#/components/menus/index.ts';
import { Money } from '#/components/money/index.ts';
import { buildRecurrenceMenu } from '#/components/recurrences/build-recurrence-menu.util.ts';
import { PartialBar } from '#/components/recurrences/partial-bar.component.tsx';
import { recurrenceActionLabel } from '#/components/recurrences/recurrence-action-label.util.ts';
import { RecurrenceStatusChip } from '#/components/recurrences/recurrence-status-chip.component.tsx';
import type {
  RecurrenceAction,
  RecurrenceFlow,
  RecurrenceInlineAction,
  RecurrenceStatus,
} from '#/components/recurrences/recurrence-status.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type RecurrenceRowProps = {
  name: string;
  icon: IconName;
  flow: RecurrenceFlow;
  /** Date rule in Portuguese: "Todo dia 20", "Por volta do dia 25", "Até o 5º dia útil". */
  rule: string;
  /** Account or sender beside the rule ("Nubank, crédito", "Pix de G. Prado"). */
  account?: string;
  status: RecurrenceStatus;
  /** Second line of the state column: "Recebido 07/10", "Em 3 dias", "Esperado 21,90". */
  statusNote?: string;
  /** Integer cents: the expected amount, or what came in so far when `status` is "partial". */
  amountCents: number;
  /** Partial only: the full expected amount ("425,00 de 850,00" with the bar). */
  totalCents?: number;
  /** Buttons under the row, for the occurrences that ask for a decision. */
  inlineActions?: readonly RecurrenceInlineAction[];
  onAction: (action: RecurrenceAction) => void;
  className?: string;
};

/**
 * Recurrence row (components.md 10.2, ui adjustment 3): category icon with type badge, name, date
 * rule and account, state column (chip and note), amount through Money (sign column, weight 400)
 * and the "…" menu. 4 columns on the phone with the state on a second line.
 */
export function RecurrenceRow({
  name,
  icon,
  flow,
  rule,
  account,
  status,
  statusNote,
  amountCents,
  totalCents,
  inlineActions,
  onAction,
  className,
}: RecurrenceRowProps) {
  const dismissed = status === 'dismissed';
  const partial = status === 'partial' && totalCents !== undefined;
  const sign = flow === 'income' ? 'plus' : 'minus';
  const tone = dismissed ? 'faded' : flow === 'income' ? 'income' : 'inherit';

  return (
    <li
      className={cx(
        'grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-s12 gap-y-s4 py-s12 lg:grid-cols-[auto_1fr_11rem_auto_auto]',
        className,
      )}
    >
      <CategoryIcon icon={icon} type={flow} />
      <div className="min-w-0">
        <p
          className={cx(
            'text-body font-emphasis',
            dismissed ? 'text-fg-tertiary line-through' : 'text-fg-primary',
          )}
        >
          {name}
        </p>
        <p className="flex flex-wrap gap-x-s12 text-label text-fg-secondary">
          <span>{rule}</span>
          {account ? <span>{account}</span> : null}
        </p>
      </div>
      <div className="col-start-2 col-end-5 row-start-2 flex items-center gap-s8 lg:col-start-auto lg:col-end-auto lg:row-start-auto lg:flex-col lg:items-end lg:gap-s4">
        <RecurrenceStatusChip status={status} />
        {statusNote ? <span className="text-meta text-fg-secondary">{statusNote}</span> : null}
      </div>
      <div className="flex min-w-0 flex-col items-end gap-s4 lg:w-36">
        {partial ? (
          <>
            <span className="inline-flex items-baseline gap-s4 text-money-row">
              <Money cents={amountCents} sign={sign} signColumn weight="plain" tone={tone} />
              <span className="text-meta text-fg-secondary">de</span>
              <Money cents={totalCents} sign="none" weight="plain" tone="faded" />
            </span>
            <PartialBar
              paidCents={amountCents}
              totalCents={totalCents}
              label={`Recebido de ${name}`}
            />
          </>
        ) : (
          <Money
            cents={amountCents}
            sign={sign}
            signColumn
            weight="plain"
            tone={tone}
            className="text-money-row"
          />
        )}
      </div>
      <OverflowMenu
        label={`Ações de ${name}`}
        items={buildRecurrenceMenu(flow, status)}
        onAction={(key) => onAction(key as RecurrenceAction)}
      />
      {inlineActions?.length ? (
        <div className="col-span-full flex flex-wrap items-center gap-s8 lg:col-start-2">
          {inlineActions.map((action) => (
            <Button
              key={action}
              size="sm"
              variant={action === 'edit-expected' ? 'tertiary' : 'secondary'}
              onPress={() => onAction(action)}
            >
              {recurrenceActionLabel(action, flow)}
            </Button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
