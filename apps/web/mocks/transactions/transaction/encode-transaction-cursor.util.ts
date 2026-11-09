export type TransactionCursorKey = [string, string, string, string];

// The opaque cursor of the list, as in the API: the sort key of the last item of the page
// (competence, date, creation instant, id) in base64url. The next page starts after it.
export function encodeTransactionCursor(key: TransactionCursorKey): string {
  return btoa(JSON.stringify(key)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
