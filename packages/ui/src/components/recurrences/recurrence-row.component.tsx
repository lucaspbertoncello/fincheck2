import { useId, useState, type ReactNode } from 'react';

import { Button } from '#/components/buttons/index.ts';
import { Collapse } from '#/components/disclosure/index.ts';
import { CategoryIcon, Icon } from '#/components/icons/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import { ListRow } from '#/components/list-row/index.ts';
import { useMediaQuery } from '#/hooks/viewport/index.ts';
import { OverflowMenu } from '#/components/menus/index.ts';
import { ServiceLogo, type ServiceLogoData } from '#/components/service-logos/index.ts';
import { Money } from '#/components/money/index.ts';
import { buildRecurrenceMenu } from '#/components/recurrences/build-recurrence-menu.util.ts';
import { PartialBar } from '#/components/recurrences/partial-bar.component.tsx';
import { recurrenceActionLabel } from '#/components/recurrences/recurrence-action-label.util.ts';
import { RecurrenceStatusChip } from '#/components/recurrences/recurrence-status-chip.component.tsx';
import { RecurrenceTransactions } from '#/components/recurrences/recurrence-transactions.component.tsx';
import { RecurrenceValueNotes } from '#/components/recurrences/recurrence-value-notes.component.tsx';
import type {
  RecurrenceAction,
  RecurrenceFlow,
  RecurrenceInlineAction,
  RecurrenceStatus,
} from '#/components/recurrences/recurrence-status.type.ts';
import type { RecurrenceTransaction } from '#/components/recurrences/recurrence-transaction.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type RecurrenceRowProps = {
  name: string;
  icon: IconName;
  /** A subscription service with a logo: its logo replaces the category icon. */
  service?: ServiceLogoData | null;
  flow: RecurrenceFlow;
  /** Date rule in Portuguese: "Todo dia 20", "Por volta do dia 25", "Até o 5º dia útil". */
  rule: string;
  /** Account or sender beside the rule ("Nubank, crédito", "Pix de G. Prado"). */
  account?: string;
  status: RecurrenceStatus;
  /** What the state says in a few words: "Recebido 07/10", "Em 3 dias", "Venceu 20/10, sem pagamento ligado". */
  statusNote?: string;
  /** Integer cents: what came in so far, or the expected amount while nothing has come in. */
  amountCents: number;
  /** Something came in: the full expected amount, under the value as "≈ R$ 800 previstos". */
  expectedCents?: number;
  /** Something came in and the rest is still open: "faltam ≈ R$ 400", with the bar. */
  remainingCents?: number;
  /** What came in above the expected amount: "R$ 300 a mais". */
  excessCents?: number;
  /**
   * The transactions linked to the occurrence this month. Given (even empty), the row opens: a
   * click on it unfolds them under the row, a second click folds them. Left out, the row is fixed.
   */
  transactions?: readonly RecurrenceTransaction[];
  /** A late one brought from an earlier month: the empty list does not say "neste mês". */
  carriedOver?: boolean;
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
 * and the status chip, the detail (state, rule, account), the amount at the right end, the "…" menu
 * and the decision buttons on a strip of their own: the first one primary, the others secondary, all
 * the same size (no text-look action beside a pill).
 *
 * From the desktop the detail is one line cut with an ellipsis (the whole text in the `title`) and
 * the reference lines (expected, missing, above, with the bar while part is open) sit under the
 * amount. Below it the amount stays alone in its column and the detail, in as many lines as it
 * takes, the references and the bar go to the strip under the row, aligned with the text, so the
 * name and the detail keep the room they had.
 *
 * With `transactions` the whole row is a button (`ListRow` `onOpen`, with a chevron after the state)
 * that opens the linked transactions in a `Collapse` under it, each row on its own. The menu and the
 * strip buttons sit above that button and work without opening anything.
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
  expectedCents,
  remainingCents,
  excessCents,
  transactions,
  carriedOver = false,
  inlineActions,
  detailMode = 'schedule',
  decision,
  onAction,
  className,
}: RecurrenceRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const expandable = transactions !== undefined;

  // From the desktop the references sit in the value column and the detail is one line cut with an
  // ellipsis (the whole text in the `title`); below it the value column keeps only the main value
  // and detail, references and bar go to the strip under the row, as wide as the card.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const dismissed = status === 'dismissed';
  const open = remainingCents !== undefined && remainingCents > 0 && expectedCents !== undefined;
  const sign = flow === 'income' ? 'plus' : 'minus';
  const tone = dismissed ? 'faded' : flow;
  const detail = (detailMode === 'reason' ? [statusNote] : [statusNote, rule, account])
    .filter((part): part is string => Boolean(part))
    .join(' · ');
  // Nothing came in and it is still due: the main value is the expected one. A dismissed month has
  // no reference to add.
  const forecast = expectedCents === undefined && (status === 'expected' || status === 'late');
  const hasNotes = !dismissed && (forecast || expectedCents !== undefined);
  const notes = (layout: 'column' | 'inline') => (
    <RecurrenceValueNotes
      layout={layout}
      forecast={forecast}
      expectedCents={expectedCents}
      remainingCents={remainingCents}
      excessCents={excessCents}
    />
  );
  const bar = open ? (
    <PartialBar
      paidCents={amountCents}
      totalCents={expectedCents ?? 0}
      label={`Recebido de ${name}`}
      className="w-full min-w-24"
    />
  ) : undefined;

  const buttons =
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
      : undefined);
  // The strip lines start at the text (mark 36 px and 12 px).
  const stripLead = isDesktop ? null : (
    <>
      {detail ? <p className="basis-full pl-12 text-label text-fg-secondary">{detail}</p> : null}
      {hasNotes ? (
        <div className="basis-full pl-12 text-meta text-fg-secondary">{notes('inline')}</div>
      ) : null}
      {bar ? <div className="basis-full pl-12">{bar}</div> : null}
    </>
  );
  const hasStripLead = !isDesktop && Boolean(detail || hasNotes || bar);

  const row = (
    <ListRow
      as={expandable ? 'div' : 'li'}
      mark={
        service ? <ServiceLogo slug={service.slug} /> : <CategoryIcon icon={icon} type={flow} />
      }
      name={name}
      nameClassName={dismissed ? 'text-fg-tertiary line-through' : undefined}
      onOpen={expandable ? () => setIsOpen((current) => !current) : undefined}
      openLabel={expandable ? `Transações de ${name}` : undefined}
      expanded={expandable ? isOpen : undefined}
      controls={expandable ? panelId : undefined}
      // One unit, so the chevron never sits alone on a line.
      badges={[
        <span key="status" className="inline-flex items-center gap-s4">
          <RecurrenceStatusChip status={status} />
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
        </span>,
      ]}
      detail={
        isDesktop && detail ? <span className="block min-w-0 truncate">{detail}</span> : undefined
      }
      detailTitle={isDesktop ? detail : undefined}
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
      valueNote={isDesktop && hasNotes ? notes('column') : undefined}
      valueExtra={isDesktop ? bar : undefined}
      menu={
        <OverflowMenu
          label={`Ações de ${name}`}
          items={buildRecurrenceMenu(flow, status)}
          onAction={(key) => onAction(key as RecurrenceAction)}
        />
      }
      actions={
        hasStripLead || buttons ? (
          <>
            {stripLead}
            {buttons}
          </>
        ) : undefined
      }
      className={expandable ? undefined : className}
    />
  );

  if (!expandable) return row;

  return (
    <li className={className}>
      {row}
      <Collapse isOpen={isOpen} id={panelId} contentClassName="pb-s12">
        {/* Under the text (mark 36 or 40 px and 12 px), ending where the amount ends (menu 44 or 40 px and 12 px). */}
        <div className="pr-14 pl-12 lg:pr-13 lg:pl-13">
          <RecurrenceTransactions
            label={`Transações de ${name}`}
            flow={flow}
            transactions={transactions}
            emptyLabel={
              carriedOver ? 'Nenhuma transação vinculada' : 'Nenhuma transação vinculada neste mês'
            }
          />
        </div>
      </Collapse>
    </li>
  );
}
