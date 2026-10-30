// Upper case, no accents, single spaces. The same normalization the API applies to rule patterns,
// recurrence `matchText` and counterparties, so the front can show the pattern before sending it.
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();
}
