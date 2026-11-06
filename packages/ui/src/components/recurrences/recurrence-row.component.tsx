import type { ReactNode } from 'react';

import { Button } from '#/components/buttons/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import { ListRow } from '#/components/list-row/index.ts';
import { OverflowMenu } from '#/components/menus/index.ts';
import { ServiceLogo, type ServiceLogoData } from '#/components/service-logos/index.ts';
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

type RecurrenceRowProps = {
  name: string;
  icon: IconName;
  /** A recognized subscription service: its logo replaces the category icon. */
  service?: ServiceLogoData | null;
  flow: RecurrenceFlow;
  /** Date rule in Portuguese: "Todo dia 20", "Por volta do dia 25", "Até o 5º dia útil". */
  rule: string;
  /** Account or sender beside the rule ("Nubank, crédito", "Pix de G. Prado"). */
  account?: string;
  status: RecurrenceStatus;
  /** What the state says in a few words: "Recebido 07/10", "Em 3 dias", "Venceu 20/10, sem pagamento ligado". */
  statusNote?: string;
  /** Integer cents: the expected amount, or what came in so far when `status` is "partial". */
  amountCents: number;
  /** Partial only: the full expected amount ("R$ 400" over "de R$ 800" with the bar). */
  totalCents?: number;
  /** Buttons on the strip under the row, for the occurrences that ask for a decision. */
  inlineActions?: readonly RecurrenceInlineAction[];
  /**
   * "reason" (the "Precisa de você" strip) makes the detail line the reason alone; the default
   * writes the state, the rule and the account.
   */
  detailMode?: 'schedule' | 'reason';
  /** Replaces the strip content with a decision of its own (`ExpectedValueUpdate`). */
  decision?: ReactNode;
  onAction: (action: RecurrenceAction) => void;
  className?: string;
};

/**
 * Recurrence row (components.md 10.2) on the standard list row: category icon with type badge, name
 * and the status chip, one detail line (state, rule, account), the amount at the right end (a
 * partial one in two lines, "R$ 400" over "de R$ 800", with the bar), the "…" menu and the
 * decision buttons on a strip of their own: the first one primary, the others secondary, all the
 * same size (no text-look action beside a pill).
 */
export function RecurrenceRow({
  name,
  icon,
  service,
  flow,
  rule,
  account,
  status,
  statusNote,
  amountCents,
  totalCents,
  inlineActions,
  detailMode = 'schedule',
  decision,
  onAction,
  className,
}: RecurrenceRowProps) {
  const dismissed = status === 'dismissed';
  const partial = status === 'partial' && totalCents !== undefined;
  const sign = flow === 'income' ? 'plus' : 'minus';
  const tone = dismissed ? 'faded' : flow;
  const detail = (detailMode === 'reason' ? [statusNote] : [statusNote, rule, account]).filter(
    (part): part is string => Boolean(part),
  );

  return (
    <ListRow
      mark={
        service ? (
          <ServiceLogo slug={service.slug} name={service.name} />
        ) : (
          <CategoryIcon icon={icon} type={flow} />
        )
      }
      name={name}
      nameClassName={dismissed ? 'text-fg-tertiary line-through' : undefined}
      badges={[<RecurrenceStatusChip key="status" status={status} />]}
      detail={detail.join(' · ')}
      detailTitle={detail.join(' · ')}
      value={
        <Money
          cents={amountCents}
          sign={sign}
          signColumn
          weight="plain"
          tone={tone}
          className="text-money-row"
        />
      }
      valueNote={
        partial ? (
          <>
            de <Money cents={totalCents} sign="none" weight="plain" className="text-meta" />
          </>
        ) : undefined
      }
      valueExtra={
        partial ? (
          <PartialBar
            paidCents={amountCents}
            totalCents={totalCents}
            label={`Recebido de ${name}`}
            className="w-full min-w-24"
          />
        ) : undefined
      }
      menu={
        <OverflowMenu
          label={`Ações de ${name}`}
          items={buildRecurrenceMenu(flow, status)}
          onAction={(key) => onAction(key as RecurrenceAction)}
        />
      }
      actions={
        decision ??
        (inlineActions?.length
          ? inlineActions.map((action, index) => (
              <Button
                key={action}
                size="sm"
                variant={index === 0 ? 'primary' : 'secondary'}
                onPress={() => onAction(action)}
              >
                {recurrenceActionLabel(action, flow)}
              </Button>
            ))
          : undefined)
      }
      className={className}
    />
  );
}
