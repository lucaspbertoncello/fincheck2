import { HideValuesButton } from '#/components/money/hide-values-button.component.tsx';
import { Skeleton } from '#/components/states/skeleton.component.tsx';

const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] as const;

type FreeBalanceSkeletonProps = {
  variant: 'full' | 'compact';
  isHidden: boolean;
  onToggleHidden: () => void;
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-s12 py-s12">
      <Skeleton className="size-s8" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

/**
 * The panel while there is no data: same blocks and sizes, no spinner (components.md 14.2). The
 * eye still works, so the hidden state is the same before and after the data arrives.
 */
export function FreeBalanceSkeleton({
  variant,
  isHidden,
  onToggleHidden,
}: FreeBalanceSkeletonProps) {
  if (variant === 'compact') {
    return (
      <section
        role="status"
        aria-busy="true"
        aria-label="Livre até o fim do mês"
        className="glass flex flex-col gap-s8 p-s16"
      >
        <div className="flex items-center justify-between gap-s8">
          <p className="text-meta text-fg-secondary">Livre até o fim do mês</p>
          <HideValuesButton isHidden={isHidden} onToggle={onToggleHidden} />
        </div>
        <Skeleton className="h-6 w-2/3" />
      </section>
    );
  }

  return (
    <section
      role="status"
      aria-busy="true"
      aria-label="Livre até o fim do mês"
      className="glass flex flex-col gap-s16 p-s24"
    >
      <div className="flex flex-col gap-s8">
        <div className="flex items-center justify-between gap-s8">
          <p className="text-label text-fg-secondary">Livre até o fim do mês</p>
          <HideValuesButton isHidden={isHidden} onToggle={onToggleHidden} />
        </div>
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
      <div className="flex flex-col gap-s8">
        <div className="flex gap-s4">
          {SEGMENTS.map((key) => (
            <Skeleton key={key} className="h-s8 flex-1" />
          ))}
        </div>
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
      <Skeleton className="h-12 w-full rounded-panel" />
      <div className="flex flex-col gap-s16">
        <Skeleton className="h-5 w-16" />
        <SkeletonRow />
        <SkeletonRow />
      </div>
      <span className="sr-only">Carregando</span>
    </section>
  );
}
