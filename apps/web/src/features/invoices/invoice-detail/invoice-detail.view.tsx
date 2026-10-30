import {
  Banner,
  Button,
  Chip,
  ContentSkeleton,
  EditDateField,
  EmptyState,
  Modal,
  Money,
  MoneyField,
} from '@fincheck/ui';
import { useRef } from 'react';

import { useFocusFirstInvalid } from '#/features/accounts/form-focus/hooks/use-focus-first-invalid.hook.ts';
import type {
  InvoiceDetailData,
  InvoiceDetailLine,
} from '#/features/invoices/invoice-detail/types/invoice-detail.type.ts';

const TONE = { accent: 'accent', neutral: 'neutral', ok: 'ok', warn: 'warn' } as const;

type InvoiceDetailViewProps = {
  isOpen: boolean;
  onClose: () => void;
  state: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  data: InvoiceDetailData | null;
  actionError: string | null;
  /** A payment action is running; the buttons wait. */
  isBusy: boolean;
  registering: boolean;
  onStartRegister: () => void;
  onCancelRegister: () => void;
  paymentCents: number;
  onPaymentCentsChange: (cents: number) => void;
  paidOn: string;
  onPaidOnChange: (value: string) => void;
  paymentError?: string;
  failedAttempts: number;
  onSavePayment: () => void;
  onLinkSuggestion: () => void;
  onDismissSuggestion: () => void;
};

function LineList({ lines }: { lines: readonly InvoiceDetailLine[] }) {
  return (
    <ul>
      {lines.map((line) => (
        <li
          key={line.key}
          className="flex items-center justify-between gap-s12 border-t border-line py-s12 text-label text-fg-primary"
        >
          <span className="text-fg-secondary">{line.label}</span>
          <Money cents={line.cents} sign="none" weight="plain" />
        </li>
      ))}
    </ul>
  );
}

/** The invoice of a card: total, what it is made of, payments, the payment found and every item (RF-INV-001). */
export function InvoiceDetailView({
  isOpen,
  onClose,
  state,
  onRetry,
  data,
  actionError,
  isBusy,
  registering,
  onStartRegister,
  onCancelRegister,
  paymentCents,
  onPaymentCentsChange,
  paidOn,
  onPaidOnChange,
  paymentError,
  failedAttempts,
  onSavePayment,
  onLinkSuggestion,
  onDismissSuggestion,
}: InvoiceDetailViewProps) {
  const paymentForm = useRef<HTMLDivElement>(null);
  useFocusFirstInvalid(paymentForm, failedAttempts);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="wide"
      title={data?.title ?? 'Fatura'}
      subtitle={data?.cardName}
      actions={
        <Button variant="secondary" onPress={onClose}>
          Fechar
        </Button>
      }
    >
      {state === 'loading' ? <ContentSkeleton variant="list" /> : null}
      {state === 'error' ? (
        <EmptyState
          icon="warning"
          headingLevel={3}
          title="Não deu para carregar a fatura"
          primaryAction={{ label: 'Tentar de novo', onPress: onRetry, icon: 'sync' }}
        />
      ) : null}
      {state === 'ready' && data ? (
        <>
          {actionError ? <Banner variant="error" title={actionError} /> : null}

          <header className="flex flex-col gap-s4">
            <div className="flex items-start justify-between gap-s12">
              {data.totalCents < 0 ? (
                <p className="flex items-baseline gap-s8 text-money-md text-fg-primary">
                  <span className="font-title text-body text-fg-secondary">crédito de</span>
                  <Money cents={Math.abs(data.totalCents)} sign="none" tone="income" />
                </p>
              ) : (
                <p className="text-money-md text-fg-primary">
                  <Money cents={data.totalCents} sign="none" />
                </p>
              )}
              <Chip tone={TONE[data.statusTone]}>{data.statusLabel}</Chip>
            </div>
            <p className="text-label text-fg-secondary">{data.dueLine}</p>
          </header>

          {data.suggestion ? (
            <section
              aria-label="Pagamento encontrado"
              className="flex flex-col gap-s12 rounded-panel bg-brand-weak p-s16"
            >
              <div className="flex flex-col gap-s4">
                <h3 className="text-body font-emphasis text-fg-primary">Pagamento encontrado</h3>
                <p className="text-label text-fg-secondary">
                  {data.suggestion.description}, {data.suggestion.detail}.{' '}
                  {data.suggestion.isPresumed
                    ? 'A fatura já o conta como pago; falta só vincular.'
                    : 'Vincule para abater a fatura.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-s8">
                <Button size="sm" isDisabled={isBusy} onPress={onLinkSuggestion}>
                  Vincular
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={isBusy}
                  onPress={onDismissSuggestion}
                >
                  Não é este
                </Button>
              </div>
            </section>
          ) : null}

          {data.breakdown.length > 0 || data.references.length > 0 ? (
            <section aria-label="De que é feita" className="flex flex-col">
              <h3 className="pb-s8 text-label text-fg-secondary">De que é feita</h3>
              <LineList lines={[...data.breakdown, ...data.references]} />
            </section>
          ) : null}

          <section aria-label="Pagamentos" className="flex flex-col gap-s8">
            <div className="flex items-center justify-between gap-s12">
              <h3 className="text-label text-fg-secondary">Pagamentos</h3>
              {data.canRegisterPayment && !registering ? (
                <Button size="sm" variant="tertiary" onPress={onStartRegister}>
                  Registrar pagamento
                </Button>
              ) : null}
            </div>
            {data.payments.length === 0 ? (
              <p className="border-t border-line py-s12 text-label text-fg-secondary">
                Nenhum pagamento ainda.
              </p>
            ) : (
              <ul>
                {data.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center justify-between gap-s12 border-t border-line py-s12 text-label text-fg-primary"
                  >
                    <span>{payment.label}</span>
                    <Money cents={payment.cents} sign="none" weight="plain" />
                  </li>
                ))}
              </ul>
            )}
            {registering ? (
              <div
                ref={paymentForm}
                className="flex flex-col gap-s12 rounded-panel border border-line p-s16"
              >
                <MoneyField
                  label="Valor pago"
                  cents={paymentCents}
                  onChange={onPaymentCentsChange}
                  error={paymentError}
                />
                <EditDateField label="Data do pagamento" value={paidOn} onChange={onPaidOnChange} />
                <div className="flex flex-wrap gap-s8">
                  <Button size="sm" loading={isBusy} onPress={onSavePayment}>
                    Salvar pagamento
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={isBusy}
                    onPress={onCancelRegister}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <section aria-label="Lançamentos" className="flex flex-col">
            <h3 className="pb-s8 text-label text-fg-secondary">Lançamentos</h3>
            {data.items.length === 0 ? (
              <p className="border-t border-line py-s12 text-label text-fg-secondary">
                Nenhum lançamento nesta fatura.
              </p>
            ) : (
              <ul>
                {data.items.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center gap-s12 border-t border-line py-s12 text-label text-fg-primary"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{item.title}</span>
                      <span className="text-meta text-fg-secondary">{item.meta}</span>
                    </span>
                    <Money
                      cents={item.cents}
                      sign="auto"
                      weight="plain"
                      tone={item.expected ? 'faded' : 'inherit'}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </Modal>
  );
}
