import { FreeBalancePanel } from '@fincheck/ui';

import { useHideValues } from '#/shared/hooks/use-hide-values.hook.ts';

type ApplicationSummaryPanelProps = {
  /** "full" on desktop and on the mobile Visão geral; "compact" on the other mobile screens. */
  variant: 'full' | 'compact';
};

/**
 * The "Livre até o fim do mês" panel. It has no data in this phase, so it shows its skeleton; the
 * link to `GET /dashboard/free-balance` comes with the Visão geral screen.
 */
export function ApplicationSummaryPanel({ variant }: ApplicationSummaryPanelProps) {
  const { isHidden, toggle } = useHideValues();
  return <FreeBalancePanel variant={variant} isHidden={isHidden} onToggleHidden={toggle} />;
}
