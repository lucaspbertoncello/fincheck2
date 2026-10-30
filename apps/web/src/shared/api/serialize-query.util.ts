// A query string holds text: booleans become `true`/`false`, numbers their digits; `undefined` and
// `null` are left out.
export function serializeQuery(query: object): Record<string, string> {
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    entries.push([key, String(value)]);
  }

  return Object.fromEntries(entries);
}
