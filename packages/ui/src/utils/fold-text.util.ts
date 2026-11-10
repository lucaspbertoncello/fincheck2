/** Lowercase, no accents, single spaces: the way a typed text is compared with a name. */
export function foldText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
