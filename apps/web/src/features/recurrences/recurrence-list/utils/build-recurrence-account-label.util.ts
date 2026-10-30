import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

const METHOD_LABEL: Record<string, string> = {
  credit: 'crédito',
  debit: 'débito',
  pix: 'Pix',
  cash: 'dinheiro',
  boleto: 'boleto',
  transfer: 'transferência',
};

/**
 * What goes beside the rule: the sender for an income ("Pix do Jorge"), the account and way of
 * paying for an expense ("Nubank, crédito").
 */
export function buildRecurrenceAccountLabel(
  recurrence: Pick<Recurrence.Dto, 'kind' | 'counterparty' | 'method'>,
  accountName: string | undefined,
): string | undefined {
  if (recurrence.kind === 'income') return recurrence.counterparty ?? accountName;

  const method = recurrence.method ? METHOD_LABEL[recurrence.method] : undefined;
  const parts = [accountName, method].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(', ') : (recurrence.counterparty ?? undefined);
}
