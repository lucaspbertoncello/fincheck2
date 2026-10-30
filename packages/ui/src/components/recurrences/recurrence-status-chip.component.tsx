import { Chip } from '#/components/chips/index.ts';
import { RECURRENCE_STATUS_CHIP } from '#/components/recurrences/recurrence-status.constant.ts';
import type { RecurrenceStatus } from '#/components/recurrences/recurrence-status.type.ts';

/** Chip of an occurrence state: Esperado, Confirmado, Parcial, Atrasado, Dispensada... */
export function RecurrenceStatusChip({ status }: { status: RecurrenceStatus }) {
  const chip = RECURRENCE_STATUS_CHIP[status];

  return (
    <Chip tone={chip.tone} icon={chip.icon}>
      {chip.label}
    </Chip>
  );
}
