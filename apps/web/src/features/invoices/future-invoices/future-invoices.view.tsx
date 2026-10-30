import { Button, ContentSkeleton, EmptyState, Money, Section } from '@fincheck/ui';

export type FutureInvoiceItem = {
  month: string;
  /** "Novembro 2026". */
  title: string;
  totalCents: number;
  /** "Fecha 30/11, vence 07/12". */
  dueLine: string;
  parts: readonly { key: string; label: string; cents: number }[];
};

type FutureInvoicesViewProps = {
  state: 'loading' | 'error' | 'ready';
  cardName: string;
  items: readonly FutureInvoiceItem[];
  onBack: () => void;
  onRetry: () => void;
  onViewInvoice: (month: string) => void;
};

/** The projected invoices of a card, with "Voltar aos cartões" (screens.md `rf-inv-003`). */
export function FutureInvoicesView({
  state,
  cardName,
  items,
  onBack,
  onRetry,
  onViewInvoice,
}: FutureInvoicesViewProps) {
  return (
    <Section
      title={cardName ? `Faturas futuras do ${cardName}` : 'Faturas futuras'}
      divider={false}
      action={
        <Button variant="secondary" size="sm" icon="chevron-left" onPress={onBack}>
          Voltar aos cartões
        </Button>
      }
    >
      {state === 'loading' ? <ContentSkeleton variant="cards" /> : null}
      {state === 'error' ? (
        <EmptyState
          icon="warning"
          headingLevel={3}
          title="Não deu para carregar as faturas futuras"
          primaryAction={{ label: 'Tentar de novo', onPress: onRetry, icon: 'sync' }}
        />
      ) : null}
      {state === 'ready' && items.length === 0 ? (
        <EmptyState icon="calendar" headingLevel={3} title="Nenhuma fatura futura ainda" />
      ) : null}
      {state === 'ready' && items.length > 0 ? (
        <ul className="grid grid-cols-1 items-start gap-s16 lg:grid-cols-3 lg:gap-s24">
          {items.map((item) => (
            <li key={item.month} className="glass flex flex-col gap-s12 p-s16 lg:p-s24">
              <h3 className="font-title text-body font-emphasis text-fg-primary">{item.title}</h3>
              <p className="text-money-md text-fg-primary">
                <Money cents={item.totalCents} sign="none" />
              </p>
              <p className="text-label text-fg-secondary">{item.dueLine}</p>
              <ul>
                {item.parts.map((part) => (
                  <li
                    key={part.key}
                    className="flex items-center justify-between gap-s12 border-t border-line py-s12 text-label text-fg-primary"
                  >
                    <span>{part.label}</span>
                    <Money cents={part.cents} sign="none" weight="plain" />
                  </li>
                ))}
              </ul>
              <Button variant="tertiary" size="sm" onPress={() => onViewInvoice(item.month)}>
                Ver detalhes
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
