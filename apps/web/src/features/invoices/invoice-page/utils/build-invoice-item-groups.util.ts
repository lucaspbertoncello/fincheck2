import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { recognizeService } from '#/domain/recurrences/service-logo/rules/recognize-service.rule.ts';
import type {
  InvoiceItemBadgeData,
  InvoiceItemGroupData,
  InvoiceItemRowData,
  InvoiceSortKey,
} from '#/features/invoices/invoice-page/types/invoice-page.type.ts';
import { formatShortDate } from '#/features/invoices/invoice-summary/utils/format-short-date.util.ts';
import { formatDayHeading } from '#/features/transactions/transaction-list/utils/format-day-heading.util.ts';

const UNDATED_KEY = 'undated';

function dateOf(item: Invoice.Item): string | null {
  return item.type === 'transaction' ? item.occurredOn : item.expectedOn;
}

/** The signed value of an item: a purchase is negative, a refund positive, an expected charge negative. */
function centsOf(item: Invoice.Item): number {
  return item.type === 'transaction' ? item.amountCents : -item.amountCents;
}

function buildRow(
  item: Invoice.Item,
  categories: ReadonlyMap<string, Category.Dto>,
  withDate: boolean,
): InvoiceItemRowData {
  if (item.type === 'expected_recurrence') {
    const when = item.expectedOn ? formatShortDate(item.expectedOn) : null;
    const expected = when ? `esperada em ${when}` : 'esperada no mês';
    const service = recognizeService(item.recurrenceName);

    return {
      key: item.occurrenceId,
      title: item.recurrenceName,
      detail: `Recorrente · ${expected}`,
      cents: centsOf(item),
      expected: true,
      mark: service
        ? { kind: 'subscription', service }
        : { kind: 'category', icon: 'repeat', type: 'expense', uncategorized: false },
      badges: [
        { label: 'Esperada', description: 'Cobrança esperada, ainda não lançada', tone: 'neutral' },
      ],
    };
  }

  const category = item.categoryId ? categories.get(item.categoryId) : undefined;
  const isRefund = item.amountCents > 0;
  const badges: InvoiceItemBadgeData[] = [];
  if (isRefund) badges.push({ label: 'Estorno', description: 'Estorno de compra', tone: 'ok' });
  if (item.installment) {
    badges.push({
      label: `${item.installment.number}/${item.installment.count}`,
      description: `Parcela ${item.installment.number} de ${item.installment.count}`,
      tone: 'neutral',
    });
  }
  const categoryName = category?.name ?? 'Sem categoria';
  // A refund keeps the category icon: its green badge is what says it came back.
  const service = isRefund ? null : recognizeService(item.description);

  return {
    key: item.transactionId,
    title: item.description,
    detail: withDate ? `${formatShortDate(item.occurredOn)} · ${categoryName}` : categoryName,
    cents: item.amountCents,
    expected: false,
    mark: service
      ? { kind: 'subscription', service }
      : {
          kind: 'category',
          icon: mapCategoryIcon(category?.icon),
          type: isRefund ? 'income' : 'expense',
          uncategorized: !category,
        },
    badges,
  };
}

/**
 * The items of the invoice as the blocks the list draws. By date: one block per day, newest first
 * (the order the API sends), the ones with no day last. By value: one block, the biggest charge
 * first. The subtotal of a block adds the signed values the API already gave (a refund takes off).
 */
export function buildInvoiceItemGroups(
  items: readonly Invoice.Item[],
  categories: readonly Category.Dto[],
  sort: InvoiceSortKey,
  today: string,
): InvoiceItemGroupData[] {
  const byId = new Map(categories.map((category) => [category.id, category]));

  if (sort === 'amount') {
    if (items.length === 0) return [];
    const ordered = [...items].sort((a, b) => centsOf(a) - centsOf(b));

    return [
      {
        key: 'amount',
        title: 'Do maior para o menor',
        dateLabel: '',
        count: ordered.length,
        totalCents: ordered.reduce((sum, item) => sum + centsOf(item), 0),
        rows: ordered.map((item) => buildRow(item, byId, true)),
      },
    ];
  }

  const groups = new Map<
    string,
    Omit<InvoiceItemGroupData, 'rows'> & { rows: InvoiceItemRowData[] }
  >();
  for (const item of items) {
    const date = dateOf(item);
    const key = date ?? UNDATED_KEY;
    let group = groups.get(key);
    if (!group) {
      const heading = date
        ? formatDayHeading(date, today)
        : { title: 'Sem dia definido', dateLabel: 'esperadas no mês' };
      group = { key, ...heading, count: 0, totalCents: 0, rows: [] };
      groups.set(key, group);
    }
    group.rows.push(buildRow(item, byId, false));
    group.count += 1;
    group.totalCents += centsOf(item);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key === UNDATED_KEY) return 1;
    if (b.key === UNDATED_KEY) return -1;

    return b.key.localeCompare(a.key);
  });
}
