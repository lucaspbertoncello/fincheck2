/** "PODCAST PLUS" -> "Podcast Plus": the bank writes in capitals, the screen does not shout. */
export function formatSuggestionName(description: string): string {
  return description
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}
