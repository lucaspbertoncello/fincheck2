import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { TransactionEditValues } from '@fincheck/ui';

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * Only what the person changed, so a field the server locks (the value of a split, the nature of
 * a linked invoice payment) is never sent by accident. `tagIds` are the ids of the edited tags.
 * Returns null when nothing changed.
 */
export function buildUpdateBody(
  transaction: Transaction.Dto,
  values: TransactionEditValues,
  tagIds: readonly string[],
): Transaction.UpdateRequest | null {
  const body: Transaction.UpdateRequest = {};
  const description = values.description.trim();
  const natureChanged = values.nature !== 'out_of_account' && values.nature !== transaction.nature;
  const finalNature = values.nature === 'out_of_account' ? transaction.nature : values.nature;

  if (description !== transaction.description) body.description = description;
  if (values.amountCents !== Math.abs(transaction.amountCents)) {
    body.amountCents = values.amountCents;
  }
  if (values.date !== transaction.occurredOn) body.occurredOn = values.date;
  if (natureChanged && values.nature !== 'out_of_account') body.nature = values.nature;
  if (values.nature === 'transfer') {
    if (natureChanged || values.counterpartId !== transaction.transferCounterpartId) {
      body.transferCounterpartId = values.counterpartId;
    }
  } else if (finalNature !== 'transfer' && values.categoryId !== transaction.categoryId) {
    body.categoryId = values.categoryId;
  }
  if (!sameSet(tagIds, transaction.tagIds)) body.tagIds = [...tagIds];

  return Object.keys(body).length > 0 ? body : null;
}
