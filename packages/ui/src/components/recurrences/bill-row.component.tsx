import { Button } from '#/components/buttons/index.ts';
import { Chip } from '#/components/chips/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import { PartialBar } from '#/components/recurrences/partial-bar.component.tsx';
import type { BillBadge, BillStatus } from '#/components/recurrences/bill-row.type.ts';
import type { RecurrenceFlow } from '#/components/recurrences/recurrence-status.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type BillRowProps = {
  name: string;
  icon: IconName;
  /** "expense" is a bill to pay, "income" is something to receive (friend debt, refund). */
  flow: RecurrenceFlow;
  status: BillStatus;
  /** Labels beside the due date. */
  badges?: readonly BillBadge[];
  /** "Vence 25/10, em 3 dias", "Paga em 28/09". */
  dueText: string;
  /** Invoice with a payment detected: "Pagamento encontrado no Bradesco". */
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
  className?: string;
};

/**
 * Bill row (components.md 10.2, ui adjustment 3): icon with type badge, name, badges and due text,
 * amount through Money, partial bar with "pago X · falta Y", and "Registrar pagamento". Settled
 * rows are faded and have no button. Friend debts use the "Dívida" badge and the partial bar.
 */
export function BillRow({
  name,
  icon,
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
  className,
}: BillRowProps) {
  const settled = status === 'settled';
  const partial = status === 'partial' && settledCents !== undefined;
  const sign = flow === 'income' ? 'plus' : 'minus';
  const label =
    status === 'paid-unlinked'
      ? 'Vincular'
      : (actionLabel ?? (flow === 'income' ? 'Registrar recebimento' : 'Registrar pagamento'));

  return (
    <li
      className={cx(
        'grid grid-cols-[auto_1fr_auto] items-center gap-x-s12 gap-y-s8 py-s12 lg:grid-cols-[auto_1fr_auto_auto]',
        settled && 'text-fg-tertiary',
        className,
      )}
    >
      <CategoryIcon icon={icon} type={flow} />
      <div className="min-w-0">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Editar ${name}`}
            className={cx(
              'focus-ring -mx-s4 block max-w-full cursor-pointer rounded-input px-s4 text-left text-body font-emphasis hover:underline',
              settled ? 'text-fg-secondary' : 'text-fg-primary',
            )}
          >
            {name}
          </button>
        ) : (
          <p
            className={cx(
              'text-body font-emphasis',
              settled ? 'text-fg-secondary' : 'text-fg-primary',
            )}
          >
            {name}
          </p>
        )}
        <p className="flex flex-wrap items-center gap-x-s8 gap-y-s4 text-label text-fg-secondary">
          {status === 'late' ? (
            <Chip tone="warn" icon="warning">
              Atrasada
            </Chip>
          ) : null}
          {status === 'paid-unlinked' ? (
            <Chip tone="accent" icon="link">
              Pago, falta vincular
            </Chip>
          ) : null}
          {badges?.map((badge) => (
            <Chip key={badge.label} tone={badge.tone} icon={badge.icon}>
              {badge.label}
            </Chip>
          ))}
          <span>{dueText}</span>
          {foundPayment ? (
            <Chip tone="ok" icon="link">
              {foundPayment}
            </Chip>
          ) : null}
        </p>
      </div>
      <div className="flex min-w-0 flex-col items-end gap-s4">
        <Money
          cents={amountCents}
          sign={sign}
          signColumn
          weight="plain"
          tone={settled ? 'faded' : flow === 'income' ? 'income' : 'inherit'}
          className="text-money-row"
        />
        {partial ? (
          <>
            <PartialBar
              paidCents={settledCents}
              totalCents={amountCents}
              label={flow === 'income' ? `Recebido de ${name}` : `Pago de ${name}`}
              className="w-24 lg:w-28"
            />
            <span className="text-meta text-fg-secondary">
              {flow === 'income' ? 'recebido' : 'pago'}{' '}
              <Money cents={settledCents} sign="none" weight="plain" /> · falta{' '}
              <Money cents={amountCents - settledCents} sign="none" weight="plain" />
            </span>
          </>
        ) : null}
      </div>
      {!settled && onAction ? (
        <Button
          size="sm"
          variant="secondary"
          onPress={onAction}
          className="col-start-2 col-end-4 justify-self-start lg:col-start-auto lg:col-end-auto"
        >
          {label}
        </Button>
      ) : null}
    </li>
  );
}
