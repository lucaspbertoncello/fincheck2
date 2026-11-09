/** Lowercase, no accents, single spaces: the way a typed text is compared with a tag name. */
export function foldTagText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
