// The envelope of every list of the Pluggy REST API.
export namespace PluggyPage {
  export type Response<Result> = {
    total: number;
    totalPages: number;
    page: number;
    results: Result[];
  };
}
