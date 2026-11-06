// The opaque cursor of the transaction list: the sort key of the last item of the page
// (competence, date, creation instant, id) as base64url. The next page starts after it.
export function encodeTransactionCursor(key: [string, string, string, string]): string {
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}
