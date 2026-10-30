import type { SegmentedOption } from '@fincheck/ui';

export const VIEW_OPTIONS: SegmentedOption[] = [
  { key: 'list', label: 'Lista', icon: 'list' },
  { key: 'category', label: 'Por categoria', icon: 'tag' },
];

export const TYPE_OPTIONS: SegmentedOption[] = [
  { key: 'all', label: 'Todas' },
  { key: 'expense', label: 'Despesas' },
  { key: 'income', label: 'Receitas' },
];
