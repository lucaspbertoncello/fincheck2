import { Button, CategoryIcon, Chip, OverflowMenu } from '@fincheck/ui';

import type { IdleRecurrenceData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';

type IdleRecurrenceRowProps = {
  recurrence: IdleRecurrenceData;
  onResume: (recurrenceId: string, name: string) => void;
  onEdit: (recurrenceId: string) => void;
};

/** A recurrence that has nothing this month: paused (with "Retomar") or starting later. */
export function IdleRecurrenceRow({ recurrence, onResume, onEdit }: IdleRecurrenceRowProps) {
  return (
    <li
      className={`flex flex-wrap items-center gap-x-s12 gap-y-s8 py-s12 ${recurrence.pending ? 'pointer-events-none opacity-50' : ''}`}
    >
      <CategoryIcon icon={recurrence.icon} type={recurrence.flow} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-emphasis text-fg-primary">{recurrence.name}</p>
        <p className="text-label text-fg-secondary">{recurrence.rule}</p>
      </div>
      <Chip icon={recurrence.paused ? 'clock' : 'calendar'}>{recurrence.note}</Chip>
      {recurrence.paused ? (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => onResume(recurrence.recurrenceId, recurrence.name)}
        >
          Retomar
        </Button>
      ) : null}
      <OverflowMenu
        label={`Ações de ${recurrence.name}`}
        items={[{ key: 'edit', label: 'Editar', icon: 'edit' }]}
        onAction={() => onEdit(recurrence.recurrenceId)}
      />
    </li>
  );
}
