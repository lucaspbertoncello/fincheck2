import { Skeleton } from '@fincheck/ui';

const ROW_KEYS = ['a', 'b', 'c', 'd'] as const;

/** Skeleton of the final screen: the two total cards, the section title and four rows. */
export function SubscriptionListLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-s24">
      <span className="sr-only">Carregando</span>
      <div className="grid gap-s16 lg:grid-cols-2 lg:gap-s24">
        {ROW_KEYS.slice(0, 2).map((key) => (
          <div key={key} className="glass flex flex-col gap-s8 p-s16 lg:px-s24">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-s16 border-t border-line pt-s24">
        <Skeleton className="h-ctl-sm w-40" />
        <div className="flex flex-col">
          {ROW_KEYS.map((key) => (
            <div
              key={key}
              className="flex items-center gap-s12 border-t border-line py-s12 first:border-t-0"
            >
              <Skeleton className="size-ctl-tab shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-s8">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex flex-col items-end gap-s8">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
