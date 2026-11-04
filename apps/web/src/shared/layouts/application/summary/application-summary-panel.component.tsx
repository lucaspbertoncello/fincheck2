import { Button, FreeBalancePanel } from '@fincheck/ui';

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
      <section
        aria-label="Saldo em contas"
        role="alert"
        className="flex flex-col items-start gap-s12 rounded-card border border-line bg-modal p-s16 shadow-[0_1px_2px_oklch(0_0_0/0.05),0_12px_28px_-14px_oklch(0.2_0.03_180/0.22)] lg:p-s24"
      >
        <p className="text-list text-fg-primary">Não deu para carregar o saldo.</p>
        <p className="text-label text-fg-secondary">Confira se a API está no ar e tente de novo.</p>
        <Button variant="secondary" size="sm" onPress={summary.retry}>
          Tentar de novo
        </Button>
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
