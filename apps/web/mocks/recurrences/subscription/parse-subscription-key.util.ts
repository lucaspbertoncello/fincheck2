// The two parts of a suggestion key, `pattern|accountId`. The card id has no `|`, so the last bar
// splits them even when the description has one. Null when the key has no usable bar.
export function parseSubscriptionKey(key: string): { pattern: string; accountId: string } | null {
  const bar = key.lastIndexOf('|');
  if (bar <= 0 || bar === key.length - 1) return null;

  return { pattern: key.slice(0, bar), accountId: key.slice(bar + 1) };
}
