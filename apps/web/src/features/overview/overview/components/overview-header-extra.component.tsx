import { RemainingLine } from '@fincheck/ui';
import type { RemainingLineData } from '@fincheck/ui';

type OverviewHeaderExtraProps = {
  remaining: { isVisible: boolean; data: RemainingLineData | undefined };
};

/** The header block of the Visão geral: the "Faltam N dias" strip (only the current month has it). */
export function OverviewHeaderExtra({ remaining }: OverviewHeaderExtraProps) {
  if (!remaining.isVisible) return null;

  return <RemainingLine data={remaining.data} />;
}
