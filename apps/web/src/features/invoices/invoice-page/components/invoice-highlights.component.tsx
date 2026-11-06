import { CategoryIcon, Chip, ListRow, Money, Section } from '@fincheck/ui';

import type { InvoiceHighlightsData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceHighlightsProps = {
  data: InvoiceHighlightsData;
};

/**
 * "Destaques" (BR-INV-006): the biggest purchase, the installments that end on this invoice and
 * what the next invoice already has between installments and card subscriptions. The first two
 * are on the standard row; the last is a sentence with the value.
 */
export function InvoiceHighlights({ data }: InvoiceHighlightsProps) {
  const hasRows = data.largest !== null || data.ending.length > 0;

  return (
    <Section title="Destaques" variant="glass">
      {hasRows ? (
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {data.largest ? (
            <ListRow
              mark={<CategoryIcon icon="receipt" />}
              name={data.largest.title}
              detail="Maior compra desta fatura"
              value={
                <Money
                  cents={data.largest.cents}
                  sign="none"
                  tone="expense"
                  weight="plain"
                  className="text-money-row"
                />
              }
            />
          ) : null}
          {data.ending.map((item) => (
            <ListRow
              key={item.key}
              mark={<CategoryIcon icon="calendar" />}
              name={item.title}
              badges={[<Chip key="part">{item.partLabel}</Chip>]}
              detail="Última parcela: termina nesta fatura"
              value={
                <Money
                  cents={item.cents}
                  sign="none"
                  tone="expense"
                  weight="plain"
                  className="text-money-row"
                />
              }
            />
          ))}
        </ul>
      ) : (
        <p className="text-label text-fg-secondary">
          Nenhuma compra em destaque e nenhuma parcela termina nesta fatura.
        </p>
      )}
      <p className="flex flex-wrap items-baseline gap-x-s8 gap-y-s4 mt-auto rounded-panel bg-subtle p-s16 text-label text-fg-secondary">
        {data.nextCents === 0 ? (
          <span>A próxima fatura ainda não tem parcelas nem assinaturas previstas.</span>
        ) : (
          <>
            <span>{data.nextLabel}</span>
            <Money
              cents={data.nextCents}
              sign="none"
              tone="expense"
              weight="emphasis"
              className="text-body"
            />
            <span>em parcelas e assinaturas.</span>
          </>
        )}
      </p>
    </Section>
  );
}
