import type { SegmentedOption } from '@fincheck/ui';

export const VIEW_OPTIONS: SegmentedOption[] = [
  { key: 'list', label: 'Lista', icon: 'list' },
  { key: 'category', label: 'Por categoria', icon: 'tag' },
];

export const TYPE_OPTIONS: SegmentedOption[] = [
  { key: 'all', label: 'Todas', tone: 'neutral' },
  { key: 'expense', label: 'Despesas', tone: 'loss' },
  { key: 'income', label: 'Receitas', tone: 'gain' },
];
