import { HideValuesButton } from '#/components/money/hide-values-button.component.tsx';
import { Skeleton } from '#/components/states/skeleton.component.tsx';
import { PANEL_LABELS, PANEL_SURFACE } from '#/components/summary/panel-labels.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type FreeBalanceSkeletonProps = {
  variant: 'full' | 'compact';
  isHidden: boolean;
  onToggleHidden: () => void;
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-s12 py-s8">
      <Skeleton className="size-8 rounded-capsule" />
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
        aria-label={PANEL_LABELS.panel}
        className={cx(PANEL_SURFACE, 'flex flex-col gap-s8 p-s16')}
      >
        <div className="flex items-center justify-between gap-s8">
          <p className="text-meta text-fg-secondary">{PANEL_LABELS.panel}</p>
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
      aria-label={PANEL_LABELS.panel}
      className={cx(PANEL_SURFACE, 'flex flex-col gap-s16 p-s24')}
    >
      <div className="flex flex-col gap-s4">
        <div className="flex items-center justify-between gap-s8">
          <p className="text-label text-fg-secondary">{PANEL_LABELS.panel}</p>
          <HideValuesButton isHidden={isHidden} onToggle={onToggleHidden} />
        </div>
        <Skeleton className="h-12 w-4/5" />
      </div>
      <div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
      <div className="flex flex-col gap-s4">
        <Skeleton className="h-5 w-16" />
        <SkeletonRow />
        <SkeletonRow />
      </div>
      <span className="sr-only">Carregando</span>
    </section>
  );
}
