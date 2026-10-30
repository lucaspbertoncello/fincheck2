import type { ChipTone } from '#/components/chips/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import type { RecurrenceStatus } from '#/components/recurrences/recurrence-status.type.ts';

type StatusChip = { label: string; tone: ChipTone; icon: IconName };

/** Chip of each state (components.md 10.2). */
export const RECURRENCE_STATUS_CHIP: Record<RecurrenceStatus, StatusChip> = {
  expected: { label: 'Esperado', tone: 'neutral', icon: 'clock' },
  received: { label: 'Confirmado', tone: 'ok', icon: 'check' },
  partial: { label: 'Parcial', tone: 'accent', icon: 'coins' },
  late: { label: 'Atrasado', tone: 'warn', icon: 'warning' },
  different: { label: 'Valor diferente', tone: 'warn', icon: 'warning' },
  dismissed: { label: 'Dispensada', tone: 'neutral', icon: 'close' },
  'paid-unlinked': { label: 'Pago, falta vincular', tone: 'accent', icon: 'link' },
};
