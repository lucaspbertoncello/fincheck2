const MAX_TAG_LENGTH = 24;

/**
 * Typed text to a tag name: no "#", lowercase, single hyphens between words, at most 24 characters.
 * "  # Café  da Manhã " -> "café-da-manhã". Empty when nothing is left.
 */
export function normalizeTag(text: string): string {
  return text
    .trim()
    .replace(/^#+\s*/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, MAX_TAG_LENGTH)
    .replace(/-+$/, '');
}
