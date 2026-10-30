import { Button, Chip, FreeBalancePanel } from '@fincheck/ui';

import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';
import { useApplicationSummary } from '#/shared/layouts/application/summary/use-application-summary.hook.ts';

type ApplicationSummaryPanelProps = {
  /** "full" on desktop and on the mobile Visão geral; "compact" on the other mobile screens. */
  variant: 'full' | 'compact';
};

/**
 * The "Livre até o fim do mês" panel, tied to `GET /dashboard/free-balance`. Loading shows the
 * panel skeleton, a failure shows a retry, and a partial Livre (R2) carries its notice inside the panel.
 */
export function ApplicationSummaryPanel({ variant }: ApplicationSummaryPanelProps) {
  const { isHidden, toggle } = useHideValues();
  const summary = useApplicationSummary();

  if (summary.status === 'error') {
    return (
      <section
        aria-label="Livre até o fim do mês"
        role="alert"
        className="glass flex flex-col items-start gap-s12 p-s16 lg:p-s24"
      >
        <p className="text-list text-fg-primary">Não deu para carregar o Livre.</p>
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

  const { data } = summary;
  return (
    <div className="flex flex-col gap-s12">
      <FreeBalancePanel data={data} variant={variant} isHidden={isHidden} onToggleHidden={toggle} />
      {variant === 'compact' && data.staleNote ? (
        <Chip tone="warn" icon="warning" className="self-start">
          {data.staleNote}
        </Chip>
      ) : null}
    </div>
  );
}
