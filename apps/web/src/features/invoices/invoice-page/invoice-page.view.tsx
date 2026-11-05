import { Banner, BannerSlot, EmptyState } from '@fincheck/ui';

import { InvoiceCategoryComposition } from '#/features/invoices/invoice-page/components/invoice-category-composition.component.tsx';
import { InvoiceHighlights } from '#/features/invoices/invoice-page/components/invoice-highlights.component.tsx';
import { InvoiceItems } from '#/features/invoices/invoice-page/components/invoice-items.component.tsx';
import { InvoicePageSkeleton } from '#/features/invoices/invoice-page/components/invoice-page-skeleton.component.tsx';
import { InvoicePayments } from '#/features/invoices/invoice-page/components/invoice-payments.component.tsx';
import { InvoiceSummary } from '#/features/invoices/invoice-page/components/invoice-summary.component.tsx';
import { InvoiceSwitcher } from '#/features/invoices/invoice-page/components/invoice-switcher.component.tsx';
import { PaymentSuggestion } from '#/features/invoices/invoice-page/components/payment-suggestion.component.tsx';
import { BackPageFrame } from '#/shared/components/page/back-page-frame.component.tsx';
import type { InvoicePageViewProps } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

/**
 * The invoice of a card as a page (BR-INV-006): the way back, the title with the arrows, the top
 * (total, due, state and cycle, variation), the payment the app found, the payments, where the
 * money went by category, the highlights and the lines by day. Every state is here: loading (a
 * skeleton the size of the page), error, an invoice that does not exist and the ready page, which
 * has its own empty state for an invoice with no lines. Everything arrives ready in props.
 */
export function InvoicePageView(props: InvoicePageViewProps) {
  const { status } = props;
  const switcher = (
    <InvoiceSwitcher
      hasPrevious={props.switcher.hasPrevious}
      hasNext={props.switcher.hasNext}
      onPrevious={props.switcher.onPrevious}
      onNext={props.switcher.onNext}
    />
  );

  if (status !== 'ready') {
    return (
      <BackPageFrame
        title={status === 'not-found' ? 'Fatura não encontrada' : props.title}
        description={
          status === 'not-found' ? 'Esse endereço não leva a uma fatura.' : props.description
        }
        backHref={props.backHref}
        backLabel={props.backLabel}
        actions={status === 'not-found' ? undefined : switcher}
      >
        {status === 'loading' ? <InvoicePageSkeleton /> : null}
        {status === 'error' ? (
          <Banner
            variant="error"
            title="Não deu para carregar a fatura"
            description="Confira se o app está rodando e tente de novo."
            actionLabel="Tentar de novo"
            onAction={props.onRetry}
          />
        ) : null}
        {status === 'not-found' ? (
          <EmptyState
            icon="search"
            title="Essa fatura não existe"
            description="O endereço está errado, ou o cartão foi apagado."
            primaryAction={{ label: `Voltar para ${props.backLabel}`, onPress: props.onBack }}
          />
        ) : null}
      </BackPageFrame>
    );
  }

  const { summary, paymentForm } = props;
  const showPayments = props.payments.length > 0 || paymentForm.registering;

  return (
    <BackPageFrame
      title={props.title}
      description={props.description}
      backHref={props.backHref}
      backLabel={props.backLabel}
      actions={switcher}
    >
      <BannerSlot isOpen={Boolean(props.actionError)} gap="s16-s24">
        {props.actionError ? (
          <Banner
            variant="error"
            title={props.actionError}
            actionLabel="Fechar"
            onAction={props.onDismissActionError}
          />
        ) : null}
      </BannerSlot>

      {summary ? (
        <InvoiceSummary
          data={summary}
          onRegisterPayment={props.onRegisterPayment}
          onCorrect={props.onCorrect}
        />
      ) : null}

      {props.suggestion ? (
        <PaymentSuggestion
          suggestion={props.suggestion}
          isBusy={paymentForm.isBusy}
          onLink={props.onLinkSuggestion}
          onDismiss={props.onDismissSuggestion}
        />
      ) : null}

      {showPayments ? (
        <InvoicePayments
          payments={props.payments}
          registering={paymentForm.registering}
          isBusy={paymentForm.isBusy}
          cents={paymentForm.cents}
          onCentsChange={paymentForm.onCentsChange}
          paidOn={paymentForm.paidOn}
          onPaidOnChange={paymentForm.onPaidOnChange}
          today={paymentForm.today}
          error={paymentForm.error}
          failedAttempts={paymentForm.failedAttempts}
          onSave={paymentForm.onSave}
          onCancel={paymentForm.onCancel}
        />
      ) : null}

      {props.categoryRows.length > 0 ? (
        <InvoiceCategoryComposition
          rows={props.categoryRows}
          onToggle={props.onToggleCategory}
          onClear={props.onClearCategory}
        />
      ) : null}

      {props.highlights ? <InvoiceHighlights data={props.highlights} /> : null}

      <InvoiceItems
        groups={props.items.groups}
        totalCount={props.items.totalCount}
        shownCount={props.items.shownCount}
        searchText={props.items.searchText}
        onSearchTextChange={props.items.onSearchTextChange}
        sort={props.items.sort}
        onSortChange={props.items.onSortChange}
        categoryName={props.items.categoryName}
        onClearCategory={props.onClearCategory}
        emptyDescription={props.items.emptyDescription}
      />
    </BackPageFrame>
  );
}
