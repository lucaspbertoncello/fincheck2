import { FreeBalancePanel } from '@fincheck/ui';

import { SectionError } from '#/shared/components/states/section-error.component.tsx';
import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';
import { useApplicationSummary } from '#/shared/layouts/application/summary/use-application-summary.hook.ts';

type ApplicationSummaryPanelProps = {
  /** "full" on desktop and on the mobile Visão geral; "compact" on the other mobile screens. */
  variant: 'full' | 'compact';
};

/**
 * The "Saldo em contas" panel, tied to `GET /dashboard/free-balance`. Loading shows the
 * panel skeleton, a failure shows a retry, and a partial balance (R2) carries its notice inside the panel.
 */
export function ApplicationSummaryPanel({ variant }: ApplicationSummaryPanelProps) {
  const { isHidden, toggle } = useHideValues();
  const summary = useApplicationSummary();

  if (summary.status === 'error') {
    return (
      <section aria-label="Saldo em contas">
        <SectionError what="o saldo" onRetry={summary.retry} />
      </section>
    );
  }

  if (summary.status === 'loading') {
    return <FreeBalancePanel variant={variant} isHidden={isHidden} onToggleHidden={toggle} />;
  }

  return (
    <FreeBalancePanel
      data={summary.data}
      variant={variant}
      isHidden={isHidden}
      onToggleHidden={toggle}
    />
  );
}
