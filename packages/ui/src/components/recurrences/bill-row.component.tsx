import { Button } from '#/components/buttons/index.ts';
import { Chip } from '#/components/chips/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import { ListRow } from '#/components/list-row/index.ts';
import { Money } from '#/components/money/index.ts';
import { ServiceLogo, type ServiceLogoData } from '#/components/service-logos/index.ts';
import { PartialBar } from '#/components/recurrences/partial-bar.component.tsx';
import type { BillBadge, BillStatus } from '#/components/recurrences/bill-row.type.ts';
import type { RecurrenceFlow } from '#/components/recurrences/recurrence-status.type.ts';

import { cx } from '#/utils/class-names.util.ts';

type BillRowProps = {
  name: string;
  icon: IconName;
  /** A recognized subscription service (a recurring charge): its logo replaces the category icon. */
  service?: ServiceLogoData | null;
  /** "expense" is a bill to pay, "income" is something to receive (friend debt, refund). */
  flow: RecurrenceFlow;
  status: BillStatus;
  /** Labels after the name. The row shows two at most, the status chip (Atrasada, Pago, falta vincular) first. */
  badges?: readonly BillBadge[];
  /** "Vence 25/10, em 3 dias", "Paga em 28/09". */
  dueText: string;
  /** Invoice with a payment detected: "Pagamento encontrado no Bradesco". Goes on the detail line, not in a badge. */
  foundPayment?: string;
  /** Integer cents: the total of the bill. */
  amountCents: number;
  /** Partial only: how much is paid or received so far, in cents. */
  settledCents?: number;
  /** Button label; defaults to "Registrar pagamento" (expense) or "Registrar recebimento". */
  actionLabel?: string;
  /** Press of the action button, or of "Vincular" on a paid-unlinked bill. Absent on settled. */
  onAction?: () => void;
  /** Makes the name a real button that opens the bill to edit (Enter and Space work). Absent: plain text. */
  onEdit?: () => void;
  /** A second, quieter button beside the main one ("Ver fatura"). It stays on a settled row. */
  secondaryAction?: { label: string; onPress: () => void };
  className?: string;
};

/**
 * Bill row (components.md 10.2) on the standard list row: icon with type badge, name and up to two
 * badges (the status chip, then the kind: Recorrente, Dívida, Fatura), one detail line (due text,
 * the payment found, what is left), the amount at the right end (a partial one in two lines, with
 * the bar) and the action button on a strip of its own. Settled rows are faded and have no button.
 */
export function BillRow({
  name,
  icon,
  service,
  flow,
  status,
  badges,
  dueText,
  foundPayment,
  amountCents,
  settledCents,
  actionLabel,
  onAction,
  onEdit,
  secondaryAction,
  className,
}: BillRowProps) {
  const settled = status === 'settled';
  const partial = status === 'partial' && settledCents !== undefined;
  const sign = flow === 'income' ? 'plus' : 'minus';
  const label =
    status === 'paid-unlinked'
      ? 'Vincular'
      : (actionLabel ?? (flow === 'income' ? 'Registrar recebimento' : 'Registrar pagamento'));
  const statusChip =
    status === 'late' ? (
      <Chip key="status" tone="warn" icon="warning">
        Atrasada
      </Chip>
    ) : status === 'paid-unlinked' ? (
      <Chip key="status" tone="accent" icon="link">
        Pago, falta vincular
      </Chip>
    ) : null;
  const chips = [
    ...(statusChip ? [statusChip] : []),
    ...(badges ?? []).map((badge) => (
      <Chip key={badge.label} tone={badge.tone} icon={badge.icon}>
        {badge.label}
      </Chip>
    )),
  ].slice(0, 2);
  const detailParts = [dueText, foundPayment].filter(Boolean).join(' · ');

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
      onOpen={onEdit}
      openLabel={onEdit ? `Editar ${name}` : undefined}
      nameClassName={settled ? 'text-fg-secondary' : undefined}
      badges={
        chips.length === 2 ? [chips[0], chips[1]] : chips.length === 1 ? [chips[0]] : undefined
      }
      detail={
        partial ? (
          <>
            {detailParts} · falta{' '}
            <Money cents={amountCents - settledCents} sign="none" weight="plain" />
          </>
        ) : (
          detailParts
        )
      }
      detailTitle={partial ? undefined : detailParts}
      value={
        <Money
          cents={partial ? settledCents : amountCents}
          sign={sign}
          signColumn
          weight="plain"
          tone={settled ? 'faded' : flow === 'income' ? 'income' : 'inherit'}
          className="text-money-row"
        />
      }
      valueNote={
        partial ? (
          <>
            de <Money cents={amountCents} sign="none" weight="plain" className="text-meta" />
          </>
        ) : undefined
      }
      valueExtra={
        partial ? (
          <PartialBar
            paidCents={settledCents}
            totalCents={amountCents}
            label={flow === 'income' ? `Recebido de ${name}` : `Pago de ${name}`}
            className="w-full min-w-24"
          />
        ) : undefined
      }
      actions={
        (!settled && onAction) || secondaryAction ? (
          <>
            {!settled && onAction ? (
              <Button size="sm" variant="secondary" onPress={onAction}>
                {label}
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button size="sm" variant="tertiary" onPress={secondaryAction.onPress}>
                {secondaryAction.label}
              </Button>
            ) : null}
          </>
        ) : undefined
      }
      className={cx(settled && 'text-fg-tertiary', className)}
    />
  );
}
