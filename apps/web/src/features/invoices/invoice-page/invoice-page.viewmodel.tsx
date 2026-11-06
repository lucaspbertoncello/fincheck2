import { monthSchema } from '@fincheck/shared/common/date/date.schema.ts';
import { createInvoicePaymentRequestSchema } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.schema.ts';
import { useToast } from '@fincheck/ui';
import { useNavigate, useParams, useRouter } from '@tanstack/react-router';
import { useState } from 'react';

import { useAccountsSearch } from '#/shared/hooks/accounts/use-accounts-search.hook.ts';
import { useInvoicePageOrigin } from '#/features/invoices/invoice-page/hooks/use-invoice-page-origin.hook.ts';
import { useInvoicePageModel } from '#/features/invoices/invoice-page/invoice-page.model.ts';
import { InvoicePageView } from '#/features/invoices/invoice-page/invoice-page.view.tsx';
import type {
  InvoicePageViewProps,
  InvoiceSortKey,
} from '#/features/invoices/invoice-page/types/invoice-page.type.ts';
import { buildInvoiceCategoryRows } from '#/features/invoices/invoice-page/utils/build-invoice-category-rows.util.ts';
import { buildInvoiceHighlights } from '#/features/invoices/invoice-page/utils/build-invoice-highlights.util.ts';
import { buildInvoiceItemGroups } from '#/features/invoices/invoice-page/utils/build-invoice-item-groups.util.ts';
import { buildInvoicePayments } from '#/features/invoices/invoice-page/utils/build-invoice-payments.util.ts';
import { buildInvoiceSuggestion } from '#/features/invoices/invoice-page/utils/build-invoice-suggestion.util.ts';
import { buildInvoiceSummary } from '#/features/invoices/invoice-page/utils/build-invoice-summary.util.ts';
import { filterInvoiceItems } from '#/features/invoices/invoice-page/utils/filter-invoice-items.util.ts';
import { resolveInvoiceNeighbors } from '#/features/invoices/invoice-page/utils/resolve-invoice-neighbors.util.ts';
import { getBusinessDate } from '#/shared/utils/date/get-business-date.util.ts';
import { buildHref } from '#/shared/layouts/application/navigation/build-href.util.ts';
import { navigateToHref } from '#/shared/layouts/application/navigation/navigate-to-href.util.ts';
import { useActiveScreen } from '#/shared/layouts/application/navigation/use-active-screen.hook.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

const BACK = {
  accounts: { path: '/accounts', label: 'Contas e cartões' },
  bills: { path: '/recurrences/bills', label: 'A pagar e receber' },
} as const;

type ContentProps = { accountId: string; month: string };

/** The invoice of a card in a month (`/cards/:id/invoices/:month`); the state resets with each invoice. */
function InvoicePageContent({ accountId, month }: ContentProps) {
  const model = useInvoicePageModel(accountId, month);
  const toast = useToast();
  const router = useRouter();
  const navigate = useNavigate();
  const origin = useInvoicePageOrigin();
  const { monthParam } = useActiveScreen();
  const { update } = useAccountsSearch();

  const [sort, setSort] = useState<InvoiceSortKey>('date');
  const [searchText, setSearchText] = useState('');
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [typedCents, setTypedCents] = useState<number | null>(null);
  const [paidOn, setPaidOn] = useState(() => getBusinessDate(new Date()));
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = getBusinessDate(new Date());
  const { invoice } = model;
  const target = { accountId, month };
  const back = BACK[origin];
  const backHref = buildHref(back.path, monthParam);
  const { monthLabel, yearLabel } = formatMonthParts(month);

  const categoryRows = invoice
    ? buildInvoiceCategoryRows(invoice.categoryBreakdown, model.categories, categoryKey)
    : [];
  const items = invoice?.items ?? [];
  const shown = filterInvoiceItems(items, { categoryKey, searchText });
  const suggestion = buildInvoiceSuggestion(invoice?.paymentSuggestion ?? null);
  const neighbors = resolveInvoiceNeighbors(
    month,
    invoice?.previousTotalCents != null,
    model.listedMonths,
  );
  const remaining = invoice?.remainingCents ?? 0;

  function goTo(next: string | null) {
    if (!next) return;
    void navigate({
      to: '/cards/$accountId/invoices/$month',
      params: { accountId, month: next },
      search: ((previous: Record<string, unknown>) => previous) as never,
    });
  }

  function closePaymentForm() {
    setRegistering(false);
    setTypedCents(null);
    setPaymentError(null);
  }

  function savePayment() {
    const parsed = createInvoicePaymentRequestSchema.safeParse({
      amountCents: typedCents ?? remaining,
      paidOn,
    });
    if (!parsed.success) {
      setPaymentError('Informe um valor maior que zero e a data do pagamento');
      setFailedAttempts((count) => count + 1);
      return;
    }
    setPaymentError(null);
    setActionError(null);
    model.createPayment.mutate(
      { ...target, body: parsed.data },
      {
        onSuccess: closePaymentForm,
        onError: () => setActionError('Não deu para registrar o pagamento. Tente de novo.'),
      },
    );
  }

  function linkSuggestion() {
    if (!suggestion) return;
    setActionError(null);
    model.createPayment.mutate(
      {
        ...target,
        body: {
          amountCents: suggestion.amountCents,
          paidOn: suggestion.occurredOn,
          transactionId: suggestion.transactionId,
        },
      },
      {
        onSuccess: (updated) => {
          const payment = updated.payments.find(
            (item) => item.transactionId === suggestion.transactionId,
          );
          toast.showUndoToast({
            message: 'Pagamento vinculado à fatura. Ele não vira gasto de novo.',
            onUndo: () => {
              if (payment) model.deletePayment.mutate({ ...target, paymentId: payment.id });
            },
          });
        },
        onError: () => setActionError('Não deu para vincular o pagamento. Tente de novo.'),
      },
    );
  }

  function dismissSuggestion() {
    if (!suggestion) return;
    const { transactionId } = suggestion;
    setActionError(null);
    model.dismissSuggestion.mutate(
      { ...target, body: { transactionId } },
      {
        onSuccess: () =>
          toast.showUndoToast({
            message: 'Combinado: esse não é o pagamento desta fatura.',
            onUndo: () => model.restoreSuggestion.mutate({ ...target, transactionId }),
          }),
        onError: () => setActionError('Não deu para dispensar a sugestão. Tente de novo.'),
      },
    );
  }

  const isMonthValid = monthSchema.safeParse(month).success;
  const status: InvoicePageViewProps['status'] = !isMonthValid
    ? 'not-found'
    : model.isError
      ? 'error'
      : model.isLoading || !invoice
        ? 'loading'
        : 'ready';

  const props: InvoicePageViewProps = {
    status,
    onRetry: model.retry,
    backHref,
    backLabel: back.label,
    onBack: () => navigateToHref(router, backHref),
    title: isMonthValid ? `Fatura de ${monthLabel.toLowerCase()} ${yearLabel}` : 'Fatura',
    description: model.cardName || ' ',
    switcher: {
      hasPrevious: neighbors.previous !== null,
      hasNext: neighbors.next !== null,
      onPrevious: () => goTo(neighbors.previous),
      onNext: () => goTo(neighbors.next),
    },
    actionError,
    onDismissActionError: () => setActionError(null),
    summary: invoice ? buildInvoiceSummary(invoice, today) : null,
    onRegisterPayment: () => setRegistering(true),
    onCorrect: () => update({ correct: `${accountId}:${month}` }),
    suggestion,
    onLinkSuggestion: linkSuggestion,
    onDismissSuggestion: dismissSuggestion,
    payments: buildInvoicePayments(invoice?.payments ?? []),
    paymentForm: {
      registering,
      isBusy:
        model.createPayment.isPending ||
        model.dismissSuggestion.isPending ||
        model.deletePayment.isPending,
      cents: typedCents ?? remaining,
      onCentsChange: setTypedCents,
      paidOn,
      onPaidOnChange: setPaidOn,
      today,
      error: paymentError ?? undefined,
      failedAttempts,
      onSave: savePayment,
      onCancel: closePaymentForm,
    },
    categoryRows,
    onToggleCategory: (key) => setCategoryKey((current) => (current === key ? null : key)),
    onClearCategory: () => setCategoryKey(null),
    highlights: invoice && items.length > 0 ? buildInvoiceHighlights(invoice) : null,
    items: {
      groups: buildInvoiceItemGroups(shown, model.categories, sort, today),
      totalCount: items.length,
      shownCount: shown.length,
      searchText,
      onSearchTextChange: setSearchText,
      sort,
      onSortChange: setSort,
      categoryName: categoryRows.find((row) => row.selected)?.name ?? null,
      emptyDescription:
        invoice?.status === 'projected'
          ? 'Ainda não há compras, parcelas nem assinaturas previstas para este mês.'
          : 'Nenhuma compra, parcela ou estorno caiu nesta fatura.',
    },
  };

  return <InvoicePageView {...props} />;
}

/** The invoice page: reads the card and the month from the address and mounts the content for them. */
export function InvoicePageViewModel() {
  const { accountId = '', month = '' } = useParams({ strict: false });

  return <InvoicePageContent key={`${accountId}:${month}`} accountId={accountId} month={month} />;
}
