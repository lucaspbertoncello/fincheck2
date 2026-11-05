import { Skeleton } from '#/components/states/skeleton.component.tsx';
import { cx } from '#/utils/class-names.util.ts';
import type { ContentSkeletonVariant } from '#/components/states/content-skeleton.type.ts';

const ROW_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
const DAY_KEYS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'] as const;

type ContentSkeletonProps = {
  variant: ContentSkeletonVariant;
  className?: string;
};

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="flex flex-col">
      {ROW_KEYS.slice(0, count).map((key) => (
        <div key={key} className="flex items-center gap-s16 border-t border-line py-s16">
          <Skeleton className="size-ctl-tab shrink-0" />
          <div className="flex flex-1 flex-col gap-s8">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

function SummaryCards() {
  return (
    <div className="grid gap-s16 lg:grid-cols-3 lg:gap-s24">
      {ROW_KEYS.slice(0, 3).map((key) => (
        <div key={key} className="flex flex-col gap-s12 p-s16">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Placeholder for a screen that has no data yet: the same structure as the real content, no
 * full-screen spinner (components.md 14.2). Each variant is a rough shape, not a layout spec.
 */
export function ContentSkeleton({ variant, className }: ContentSkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={cx('flex flex-col gap-s24', className)}>
      <span className="sr-only">Carregando</span>
      {variant === 'overview' ? (
        <>
          <SummaryCards />
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-5 gap-s8 lg:grid-cols-10">
            {DAY_KEYS.map((key) => (
              <Skeleton key={key} className="h-21 rounded-panel" />
            ))}
          </div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-48 w-full rounded-panel" />
        </>
      ) : null}
      {variant === 'list' ? (
        <>
          <div className="flex gap-s12">
            <Skeleton className="h-ctl-touch w-40" />
            <Skeleton className="h-ctl-touch w-32" />
          </div>
          <SkeletonRows count={6} />
        </>
      ) : null}
      {variant === 'cards' ? (
        <div className="grid gap-s24 lg:grid-cols-2">
          {ROW_KEYS.slice(0, 4).map((key) => (
            <Skeleton key={key} className="h-48 rounded-panel" />
          ))}
        </div>
      ) : null}
      {variant === 'sections' ? (
        <>
          <Skeleton className="h-ctl-touch w-full max-w-md" />
          <SkeletonRows count={5} />
        </>
      ) : null}
    </div>
  );
}
