import { Skeleton } from '@fincheck/ui';

/** Loading state of one group: rows with a mark, a title and a subtitle. The height holds the page still. */
export function SectionSkeleton({ label, rows = 2 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-s16">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-s12">
          <Skeleton className="size-10 shrink-0" />
          <div className="flex flex-1 flex-col gap-s8">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
