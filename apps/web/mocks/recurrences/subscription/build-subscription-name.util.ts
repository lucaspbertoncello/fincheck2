// "STREAMFLIX PREMIUM" -> "Streamflix Premium": the name a suggestion proposes (max 80).
export function buildSubscriptionName(description: string): string {
  return description
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase())
    .slice(0, 80);
}
