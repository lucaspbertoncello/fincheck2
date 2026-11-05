import {
  Banner,
  BannerSlot,
  Button,
  Collapse,
  ContentSkeleton,
  ErrorState,
  FormModalGroup,
  FormModalSplit,
  ModalFrame,
  ModalHeader,
  Money,
} from '@fincheck/ui';

import { InvoiceHero } from '#/features/invoices/invoice-detail/components/invoice-hero.component.tsx';
import { InvoiceItemList } from '#/features/invoices/invoice-detail/components/invoice-item-list.component.tsx';
import { InvoiceLines } from '#/features/invoices/invoice-detail/components/invoice-lines.component.tsx';
import { PaymentForm } from '#/features/invoices/invoice-detail/components/payment-form.component.tsx';
import { PaymentSuggestion } from '#/features/invoices/invoice-detail/components/payment-suggestion.component.tsx';
import type { InvoiceDetailData } from '#/features/invoices/invoice-detail/types/invoice-detail.type.ts';

const PAYMENT_FORM_ID = 'invoice-payment-form';

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
  today: string;
  paymentError?: string;
  failedAttempts: number;
  onSavePayment: () => void;
  onLinkSuggestion: () => void;
  onDismissSuggestion: () => void;
};

/**
 * The invoice of a card in the modal pattern (RF-INV-001): header with the card-dot, the total as
 * the protagonist beside what it is made of, the payment the app found, the payments, the items.
 * The footer holds the one next action: "Registrar pagamento" and, once it is open, "Salvar".
 */
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
  today,
  paymentError,
  failedAttempts,
  onSavePayment,
  onLinkSuggestion,
  onDismissSuggestion,
}: InvoiceDetailViewProps) {
  const madeOf = data ? [...data.breakdown, ...data.references] : [];

  return (
    <ModalFrame
      bare
      tall
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="form"
    >
      <div aria-hidden="true" className="flex justify-center pt-s8 lg:hidden">
        <span className="h-(--size-sheet-handle-height) w-(--size-sheet-handle-width) rounded-capsule bg-(--color-sheet-handle)" />
      </div>
      <ModalHeader
        mark
        title={data?.title ?? 'Fatura'}
        subtitle={data?.cardName}
        className="px-s16 pt-s4 pb-s12 lg:px-s24 lg:pt-s24 lg:pb-s16"
      />
      <div className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain px-s16 pt-s4 pb-s16 lg:px-s24">
        <div className="flex flex-col gap-s16 lg:gap-s24">
          {state === 'loading' ? <ContentSkeleton variant="list" /> : null}
          {state === 'error' ? (
            <ErrorState title="Não deu para carregar a fatura" onRetry={onRetry} headingLevel={3} />
          ) : null}
          {state === 'ready' && data ? (
            <>
              <BannerSlot isOpen={Boolean(actionError)} gap="s16-s24">
                {actionError ? <Banner variant="error" title={actionError} /> : null}
              </BannerSlot>

              <FormModalSplit aside={<InvoiceHero data={data} />}>
                {madeOf.length > 0 ? (
                  <FormModalGroup label="De que é feita">
                    <InvoiceLines lines={madeOf} />
                  </FormModalGroup>
                ) : null}
              </FormModalSplit>

              {data.suggestion ? (
                <PaymentSuggestion
                  suggestion={data.suggestion}
                  isBusy={isBusy}
                  onLink={onLinkSuggestion}
                  onDismiss={onDismissSuggestion}
                />
              ) : null}

              <FormModalGroup label="Pagamentos">
                {data.payments.length === 0 ? (
                  <p className="text-label text-fg-secondary">Nenhum pagamento ainda.</p>
                ) : (
                  <ul>
                    {data.payments.map((payment) => (
                      <li
                        key={payment.id}
                        className="flex items-center justify-between gap-s12 border-t border-line py-s8 text-label text-fg-primary first:border-t-0"
                      >
                        <span>{payment.label}</span>
                        <Money cents={payment.cents} sign="none" weight="plain" />
                      </li>
                    ))}
                  </ul>
                )}
                <Collapse
                  isOpen={registering}
                  trackClassName="-mt-s8 lg:-mt-s12"
                  contentClassName="pt-s8 lg:pt-s12"
                >
                  <PaymentForm
                    formId={PAYMENT_FORM_ID}
                    cents={paymentCents}
                    onCentsChange={onPaymentCentsChange}
                    paidOn={paidOn}
                    onPaidOnChange={onPaidOnChange}
                    today={today}
                    error={paymentError}
                    failedAttempts={failedAttempts}
                    onSubmit={onSavePayment}
                  />
                </Collapse>
              </FormModalGroup>

              <FormModalGroup label="Lançamentos">
                <InvoiceItemList items={data.items} />
              </FormModalGroup>
            </>
          ) : null}
        </div>
      </div>
      <footer className="flex items-center justify-end gap-s8 border-t border-line px-s16 py-s12 lg:gap-s12 lg:px-s24 lg:py-s16">
        {registering ? (
          <>
            <Button variant="secondary" isDisabled={isBusy} onPress={onCancelRegister}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form={PAYMENT_FORM_ID}
              loading={isBusy}
              loadingLabel="Salvando..."
            >
              Salvar pagamento
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onPress={onClose}>
              Fechar
            </Button>
            {state === 'ready' && data?.canRegisterPayment ? (
              <Button onPress={onStartRegister}>Registrar pagamento</Button>
            ) : null}
          </>
        )}
      </footer>
    </ModalFrame>
  );
}
