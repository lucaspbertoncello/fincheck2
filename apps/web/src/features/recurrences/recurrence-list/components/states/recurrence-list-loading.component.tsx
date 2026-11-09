import { ContentSkeleton, Skeleton } from '@fincheck/ui';

/** Skeleton of the screen: the side selector, the card, the strip and the list. */
export function RecurrenceListLoading() {
  return (
    <div className="flex flex-col gap-s24">
      <Skeleton className="h-13.5 w-full lg:h-12.5 lg:w-[28rem]" />
      <ContentSkeleton variant="overview" />
    </div>
  );
}
