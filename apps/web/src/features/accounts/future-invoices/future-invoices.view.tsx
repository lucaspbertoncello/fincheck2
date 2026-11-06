import {
  Button,
  Chip,
  ContentSkeleton,
  EmptyState,
  ErrorState,
  Money,
  Section,
} from '@fincheck/ui';

type FutureInvoiceItem = {
  month: string;
  /** "Novembro 2026". */
  title: string;
  totalCents: number;
  /** "Fecha 30/11, vence 07/12". */
  dueLine: string;
  parts: readonly {
    key: string;
    label: string;
    cents: number;
    /** 0 to 1: its share of the parts. */ share: number;
  }[];
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
        <ErrorState
          title="Não deu para carregar as faturas futuras"
          onRetry={onRetry}
          headingLevel={3}
        />
      ) : null}
      {state === 'ready' && items.length === 0 ? (
        <EmptyState icon="calendar" headingLevel={3} title="Nenhuma fatura futura ainda" />
      ) : null}
      {state === 'ready' && items.length > 0 ? (
        <ul className="grid grid-cols-1 items-start gap-s16 lg:grid-cols-3 lg:gap-s24">
          {items.map((item) => (
            <li key={item.month} className="glass flex flex-col gap-s16 p-s16 lg:p-s24">
              <header className="flex items-center justify-between gap-s8">
                <h3 className="font-title text-body font-emphasis text-fg-primary">{item.title}</h3>
                <Chip tone="neutral">Projetada</Chip>
              </header>
              <div className="flex flex-col gap-s4">
                <p className="text-money-lg text-fg-primary">
                  <Money cents={item.totalCents} sign="none" tone="expense" />
                </p>
                <p className="text-label text-fg-secondary">{item.dueLine}</p>
              </div>
              {item.parts.length > 0 ? (
                <ul className="flex flex-col gap-s12">
                  {item.parts.map((part) => (
                    <li key={part.key} className="flex flex-col gap-s4">
                      <span className="flex items-center justify-between gap-s12 text-label text-fg-primary">
                        <span className="text-fg-secondary">{part.label}</span>
                        <Money cents={part.cents} sign="none" weight="plain" tone="expense" />
                      </span>
                      <span
                        aria-hidden="true"
                        className="block h-s4 overflow-hidden rounded-capsule bg-subtle"
                      >
                        <span
                          className="block h-full origin-left rounded-capsule bg-brand"
                          style={{ transform: `scaleX(${part.share})` }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button variant="secondary" size="sm" onPress={() => onViewInvoice(item.month)}>
                Ver detalhes
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
