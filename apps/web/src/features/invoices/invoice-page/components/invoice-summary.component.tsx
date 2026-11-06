import { Button, Chip, InvoiceCycleBar, Money, VariationBadge } from '@fincheck/ui';

import type { InvoiceSummaryData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceSummaryProps = {
  data: InvoiceSummaryData;
  onRegisterPayment: () => void;
  onCorrect: () => void;
};

/**
 * The summary box beside the card (BR-INV-006), in the order the eye reads it: the state and the
 * total, when it is due with the cycle bar, how it compares with the invoice before, then what is
 * left to pay and the actions on a strip of their own. A negative total is a credit ("crédito de
 * R$ X"), never a minus sign.
 */
export function InvoiceSummary({ data, onRegisterPayment, onCorrect }: InvoiceSummaryProps) {
  const isCredit = data.totalCents < 0;
  const hasActions = data.canRegisterPayment || data.canCorrect;

  return (
    <section aria-label="Resumo da fatura" className="glass flex flex-col gap-s16 p-s16 lg:p-s24">
      <div className="flex flex-col gap-s8">
        <div className="flex items-center justify-between gap-s12">
          <p className="text-label text-fg-secondary">Total da fatura</p>
          <Chip tone={data.statusTone}>{data.statusLabel}</Chip>
        </div>
        {isCredit ? (
          <p className="flex items-baseline gap-s8 text-money-lg text-fg-primary">
            <span className="font-title text-body text-fg-secondary">crédito de</span>
            <Money cents={Math.abs(data.totalCents)} sign="none" tone="income" />
          </p>
        ) : (
          <p className="text-money-lg text-fg-primary">
            <Money cents={data.totalCents} sign="none" tone="expense" />
          </p>
        )}
        {data.variation ? (
          <p className="flex flex-wrap items-center gap-s8 text-label text-fg-secondary">
            <VariationBadge percent={data.variation.percent} />
            que {data.variation.reference}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-s8">
        <p className="flex flex-wrap items-baseline gap-x-s8 text-label text-fg-secondary">
          <span className="text-body font-emphasis text-fg-primary first-letter:uppercase">
            {data.dueIn}
          </span>
          {data.dueLine ? <span>{data.dueLine}</span> : null}
        </p>
        {data.cycleProgress === undefined ? null : (
          <InvoiceCycleBar progress={data.cycleProgress} />
        )}
      </div>

      {data.canRegisterPayment ? (
        <div className="flex items-baseline justify-between gap-s12 border-t border-line pt-s16">
          <span className="text-label text-fg-secondary">Falta pagar</span>
          <Money
            cents={data.remainingCents}
            sign="none"
            weight="emphasis"
            tone="expense"
            className="text-money-md"
          />
        </div>
      ) : null}

      {hasActions ? (
        <div className="flex flex-wrap items-center gap-s8">
          {data.canRegisterPayment ? (
            <Button size="sm" onPress={onRegisterPayment}>
              Registrar pagamento
            </Button>
          ) : null}
          {data.canCorrect ? (
            <Button size="sm" variant="secondary" onPress={onCorrect}>
              Corrigir valor
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
