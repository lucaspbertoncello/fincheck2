import type { SectionState } from '#/features/overview/overview/overview.model.ts';

type QueryLike<Data> = {
  data: Data | undefined;
  isError: boolean;
  refetch: () => unknown;
};

/** Maps a query to the state of its block; `build` only runs when the data is there. */
export function toSectionState<Data, Built>(
  query: QueryLike<Data>,
  build: (data: Data) => Built,
): SectionState<Built> {
  if (query.isError) return { status: 'error', retry: () => void query.refetch() };
  if (query.data === undefined) return { status: 'loading' };
  return { status: 'ready', data: build(query.data) };
}
