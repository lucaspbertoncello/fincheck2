import { Chip, Money } from '@fincheck/ui';

import type { InvoiceDetailData } from '#/features/invoices/invoice-detail/types/invoice-detail.type.ts';

const TONE = { accent: 'accent', neutral: 'neutral', ok: 'ok', warn: 'warn' } as const;

type InvoiceHeroProps = {
  data: InvoiceDetailData;
};

/**
 * The protagonist of the invoice: the total, big, with its status and due line. A negative total is
 * a credit ("crédito de R$ X", BR-INV R5), never a minus sign. While there is something left to pay,
 * says how much.
 */
export function InvoiceHero({ data }: InvoiceHeroProps) {
  const isCredit = data.totalCents < 0;

  return (
    <div className="flex flex-col gap-s8">
      <Chip tone={TONE[data.statusTone]} className="self-start">
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
      <p className="text-label text-fg-secondary">{data.dueLine}</p>
      {data.canRegisterPayment ? (
        <p className="text-label text-fg-primary">
          Falta pagar <Money cents={data.remainingCents} sign="none" weight="emphasis" />
        </p>
      ) : null}
    </div>
  );
}
