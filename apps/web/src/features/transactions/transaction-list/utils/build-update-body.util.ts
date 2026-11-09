import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { TransactionEditValues } from '@fincheck/ui';

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * Only what the person changed, so a field the server locks (the value of a split, the nature of
 * a linked invoice payment) is never sent by accident.
 * Returns null when nothing changed.
 */
export function buildUpdateBody(
  transaction: Transaction.Dto,
  values: TransactionEditValues,
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
  const categoryChanged = values.categoryId !== transaction.categoryId;
  // A transfer that is one by its category ("Rotação entre contas"): taking the category off gives
  // the nature back by the sign on the server, so the other leg no longer matters.
  const dropsTransferCategory =
    transaction.nature === 'transfer' &&
    transaction.categoryId !== null &&
    values.nature === 'transfer' &&
    values.categoryId === null;

  if (dropsTransferCategory) {
    body.categoryId = null;
  } else {
    if (values.nature === 'transfer') {
      if (natureChanged || values.counterpartId !== transaction.transferCounterpartId) {
        // The other leg only goes together with the nature, which the server keeps if it is the
        // same, and so keeps the category of a transfer too.
        body.nature = 'transfer';
        body.transferCounterpartId = values.counterpartId;
      }
    } else if (natureChanged && values.nature !== 'out_of_account') {
      body.nature = values.nature;
    }
    // Where the nature itself takes the category off (to or from a transfer) a cleared category
    // does not need to be sent.
    const natureTakesIt =
      natureChanged && (finalNature === 'transfer' || transaction.nature === 'transfer');
    if (categoryChanged && !(natureTakesIt && values.categoryId === null)) {
      body.categoryId = values.categoryId;
    }
  }
  if (!sameSet(values.tagIds, transaction.tagIds)) body.tagIds = [...values.tagIds];

  return Object.keys(body).length > 0 ? body : null;
}
