import type { SegmentedOption } from '@fincheck/ui';

/** The two sides of the screen: Receitas | Despesas, with the tone of the money direction. */
export const FLOW_OPTIONS: SegmentedOption[] = [
  { key: 'income', label: 'Receitas', tone: 'gain' },
  { key: 'expense', label: 'Despesas', tone: 'loss' },
];
