import { Skeleton } from '@fincheck/ui';

type SectionSkeletonProps = {
  /** Spoken to screen readers ("Carregando o gasto do mês"). */
  label: string;
  /** Size classes of the body, the same height as the real content. */
  bodyClassName: string;
};

/** Loading placeholder of one block: a title bar and a body of the final height. */
export function SectionSkeleton({ label, bodyClassName }: SectionSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-s16 border-t border-line pt-s24"
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className={`w-full rounded-panel ${bodyClassName}`} />
    </div>
  );
}
