import type { IconName } from '@fincheck/ui';

import type { HighlightKey } from '#/features/profile/profile/types/highlight-item.type.ts';

/** Label and icon of each curiosity, in the order of the grid. Short, because no label may wrap. */
export const HIGHLIGHT_DEFINITIONS: ReadonlyArray<{
  key: HighlightKey;
  icon: IconName;
  label: string;
}> = [
  { key: 'largestPixSent', icon: 'arrow-up-right', label: 'Maior Pix enviado' },
  { key: 'largestPixReceived', icon: 'arrow-down-right', label: 'Maior Pix recebido' },
  { key: 'topCategory', icon: 'tag', label: 'Categoria líder' },
  { key: 'costliestMonth', icon: 'calendar', label: 'Mês mais caro' },
  { key: 'costliestWeekday', icon: 'calendar-mark', label: 'Dia que mais gasta' },
  { key: 'longestNoSpendStreak', icon: 'shield', label: 'Sequência sem gastar' },
];
