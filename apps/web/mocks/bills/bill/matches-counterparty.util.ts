import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

import type { MockState } from '#mocks/state/mock-state.type.ts';

// Words only, normalized, with a space on each side: a name matches as whole words ("ANA" is in
// "PIX ANA SILVA", not in "BANANA").
function toWords(value: string): string {
  return ` ${normalizeText(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `;
}

// Whether the name on the bill shows up, as whole words, in the sender, the bank description or
// the description in use of a transaction.
export function matchesCounterparty(
  counterparty: string | null,
  tx: MockState.TransactionRecord,
): boolean {
  if (counterparty === null) return false;
  const name = toWords(counterparty);
  if (name === '  ') return false;

  return [tx.bank?.counterparty ?? null, tx.bank?.description ?? null, tx.description].some(
    (text) => text !== null && toWords(text).includes(name),
  );
}
