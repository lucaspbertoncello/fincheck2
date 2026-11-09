import type { ReactNode } from 'react';

import { CardAction } from '#/components/bank-cards/card-action.component.tsx';
import { CardTag } from '#/components/bank-cards/card-tag.component.tsx';
import { InvoiceCycleBar } from '#/components/bank-cards/invoice-cycle-bar.component.tsx';
import type {
  InvoiceInstallment,
  InvoiceStatus,
} from '#/components/bank-cards/invoice-card.type.ts';
import { Money } from '#/components/money/money.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

const STATUS = {
  open: { label: 'Fatura aberta', tone: 'accent' },
  closed: { label: 'Fatura fechada', tone: 'neutral' },
  partial: { label: 'Fatura parcial', tone: 'warn' },
  overdue: { label: 'Fatura vencida', tone: 'warn' },
  paid: { label: 'Fatura paga', tone: 'income' },
} as const;

type InvoiceCardProps = {
  status: InvoiceStatus;
  /** Invoice total in integer cents. Negative means more refund than purchases: "crédito de R$ X". */
  totalCents: number;
  /** "Fecha 30/10, vence 06/11". */
  dueLine: string;
  /** From 0 to 1; the bar is hidden when absent (a paid invoice has no cycle). */
  cycleProgress?: number;
  installments: readonly InvoiceInstallment[];
  /** Opens the future invoices; the link is hidden when absent. */
  onOpenFuture?: () => void;
  /** Footer actions ("Registrar pagamento"), built with the shared buttons. */
  actions?: ReactNode;
  className?: string;
};

/**
 * Invoice below the bank card: total, due line, cycle bar, next installments, actions (3.4). The
 * actions sit at the foot: in a taller box (the invoices of a row share one height) the extra room
 * goes between the installments and the actions.
 */
export function InvoiceCard({
  status,
  totalCents,
  dueLine,
  cycleProgress,
  installments,
  onOpenFuture,
  actions,
  className,
}: InvoiceCardProps) {
  const { label, tone } = STATUS[status];
  const isCredit = totalCents < 0;

  return (
    <section
      aria-label={label}
      className={cx('glass flex flex-col gap-s16 p-s16 lg:p-s24', className)}
    >
      <header className="flex flex-col gap-s4">
        <div className="flex items-start justify-between gap-s12">
          {isCredit ? (
            <p className="flex items-baseline gap-s8 text-money-md text-fg-primary">
              <span className="font-title text-body text-fg-secondary">crédito de</span>
              <Money cents={Math.abs(totalCents)} sign="none" />
            </p>
          ) : (
            <p className="text-money-md text-fg-primary">
              <Money cents={totalCents} sign="none" tone="expense" />
            </p>
          )}
          <CardTag tone={tone}>{label}</CardTag>
        </div>
        <p className="text-label text-fg-secondary">{dueLine}</p>
      </header>

      {cycleProgress === undefined ? null : <InvoiceCycleBar progress={cycleProgress} />}

      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-s12 pb-s8">
          <h3 className="text-label font-normal text-fg-secondary">Próximas parcelas</h3>
          {onOpenFuture ? (
            <CardAction variant="tertiary" onPress={onOpenFuture}>
              Faturas futuras
            </CardAction>
          ) : null}
        </div>
        {installments.length === 0 ? (
          <p className="border-t border-line py-s12 text-label text-fg-secondary">
            Nenhuma parcela nesta fatura.
          </p>
        ) : (
          <ul>
            {installments.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-s12 border-t border-line py-s12 text-label text-fg-primary"
              >
                <span className="min-w-0 flex-1 truncate">{item.merchant}</span>
                <span className="hidden flex-1 text-center text-fg-secondary lg:block">
                  {item.partLabel}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <Money cents={item.cents} sign="none" weight="plain" tone="expense" />
                  <span className="text-meta text-fg-secondary lg:hidden">{item.partLabel}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {actions ? (
        <div className="mt-auto flex flex-wrap items-center gap-s12">{actions}</div>
      ) : null}
    </section>
  );
}
