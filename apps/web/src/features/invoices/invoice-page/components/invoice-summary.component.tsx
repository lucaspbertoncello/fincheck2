import { Button, Chip, InvoiceCycleBar, Money, VariationBadge } from '@fincheck/ui';

import type { InvoiceSummaryData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceSummaryProps = {
  data: InvoiceSummaryData;
  onRegisterPayment: () => void;
  onCorrect: () => void;
};

/**
 * The top of the invoice page (BR-INV-006): the state, the total, when it is due, the cycle bar
 * and how it compares with the invoice before. A negative total is a credit ("crédito de R$ X"),
 * never a minus sign. The actions are on a strip of their own below.
 */
export function InvoiceSummary({ data, onRegisterPayment, onCorrect }: InvoiceSummaryProps) {
  const isCredit = data.totalCents < 0;
  const hasActions = data.canRegisterPayment || data.canCorrect;

  return (
    <section aria-label="Resumo da fatura" className="flex flex-col gap-s16">
      <div className="flex flex-col gap-s8">
        <Chip tone={data.statusTone} className="self-start">
          {data.statusLabel}
        </Chip>
        {isCredit ? (
          <p className="flex items-baseline gap-s8 text-money-lg text-fg-primary">
            <span className="font-title text-body text-fg-secondary">crédito de</span>
            <Money cents={Math.abs(data.totalCents)} sign="none" tone="income" />
          </p>
        ) : (
          <p className="text-money-lg text-fg-primary">
            <Money cents={data.totalCents} sign="none" />
          </p>
        )}
        <p className="flex flex-wrap items-baseline gap-x-s8 text-label text-fg-secondary">
          <span className="text-body font-emphasis text-fg-primary first-letter:uppercase">
            {data.dueIn}
          </span>
          {data.dueLine ? <span>{data.dueLine}</span> : null}
        </p>
      </div>

      {data.cycleProgress === undefined ? null : <InvoiceCycleBar progress={data.cycleProgress} />}

      {data.variation ? (
        <p className="flex flex-wrap items-center gap-s8 text-label text-fg-secondary">
          <VariationBadge percent={data.variation.percent} />
          que {data.variation.reference}
        </p>
      ) : null}

      {data.canRegisterPayment ? (
        <p className="text-label text-fg-primary">
          Falta pagar <Money cents={data.remainingCents} sign="none" weight="emphasis" />
        </p>
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
