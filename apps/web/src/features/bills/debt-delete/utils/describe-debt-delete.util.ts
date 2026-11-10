import type { DebtDeleteEffects } from '#/features/bills/debt-delete/debt-delete.model.ts';

/**
 * The sentence of the delete confirmation. The first part is always there: the debt goes and there
 * is no undo. Then, only when it is true for this debt, what the API gives back to the transactions
 * it was tied to (it returns the origin to a whole expense with no category, and the payments
 * linked to transactions to ordinary ones).
 */
export function describeDebtDelete(person: string | null, effects: DebtDeleteEffects): string {
  const sentences = [
    person
      ? `A dívida com ${person} some e não dá para desfazer.`
      : 'A dívida some e não dá para desfazer.',
  ];
  if (effects.hasOrigin) {
    sentences.push('A transação de origem volta a ser despesa inteira, sem categoria.');
  }
  if (effects.hasLinkedPayments) {
    sentences.push('Os pagamentos ligados a transações voltam a ser transações comuns.');
  }

  return sentences.join(' ');
}
