// The envelope of a list by cursor (`GET /v2/transactions`): `next` is the query string of the next
// page, or null on the last one (https://docs.pluggy.ai/reference/transactions-list-by-cursor).
export namespace PluggyCursorPage {
  export type Response<Result> = {
    results: Result[];
    next: string | null;
  };
}
