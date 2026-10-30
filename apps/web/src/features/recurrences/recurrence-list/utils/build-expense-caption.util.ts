import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "1 paga, 1 atrasada, 1 com valor diferente"; the zeros are left out. */
export function buildExpenseCaption(summary: Recurrence.Summary): string {
  const { paidCount, lateCount, differentCount, count } = summary.expenses;
  const parts = [
    paidCount > 0 ? plural(paidCount, 'paga', 'pagas') : null,
    lateCount > 0 ? plural(lateCount, 'atrasada', 'atrasadas') : null,
    differentCount > 0 ? `${differentCount} com valor diferente` : null,
  ].filter((part): part is string => part !== null);

  if (parts.length > 0) return parts.join(', ');

  return count === 0 ? 'Nenhuma despesa fixa' : 'Nenhuma paga ainda';
}
