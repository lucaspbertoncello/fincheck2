import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

// Words only, upper case and without accents, with a space on each side: a name matches as whole
// words ("ANA" is in "PIX ANA SILVA", not in "BANANA").
function toWords(value: string): string {
  const words = normalizeText(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  return ` ${words} `;
}

// Whether the name of the person on the bill shows up in what the bank says about a transaction (the
// sender, the bank description or the one in use), as whole words, all normalized (upper case, no
// accents).
export function matchesCounterparty(
  counterparty: string | null,
  transaction: {
    counterparty: string | null;
    description: string;
    bankDescription: string | null;
  },
): boolean {
  if (counterparty === null) return false;
  const name = toWords(counterparty);
  if (name === '  ') return false;

  return [transaction.counterparty, transaction.description, transaction.bankDescription].some(
    (text) => text !== null && toWords(text).includes(name),
  );
}
