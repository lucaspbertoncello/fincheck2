import type {
  DayMarker,
  DayMarkerFlow,
  DayMarkerStatus,
} from '#/components/day-strip/day-strip.type.ts';

const STATUS_LABEL: Record<DayMarkerStatus, string> = {
  happened: 'aconteceu',
  expected: 'esperado',
  partial: 'parcial',
  late: 'atrasado',
  different: 'valor diferente',
};

const FLOW_LABEL: Record<DayMarkerFlow, string> = { income: 'Receita', expense: 'Despesa' };

/** "Receita esperada" style description, for screen readers. */
export function describeMarker({ flow, status }: DayMarker): string {
  return `${FLOW_LABEL[flow]} ${STATUS_LABEL[status]}`;
}
