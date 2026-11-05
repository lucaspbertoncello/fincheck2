import { Button, CategoryIcon, Chip, ListRow, OverflowMenu } from '@fincheck/ui';

import type { IdleRecurrenceData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';

type IdleRecurrenceRowProps = {
  recurrence: IdleRecurrenceData;
  onResume: (recurrenceId: string, name: string) => void;
  onEdit: (recurrenceId: string) => void;
};

/** A recurrence that has nothing this month: paused (with "Retomar" on the strip) or starting later. */
export function IdleRecurrenceRow({ recurrence, onResume, onEdit }: IdleRecurrenceRowProps) {
  return (
    <ListRow
      mark={<CategoryIcon icon={recurrence.icon} type={recurrence.flow} />}
      name={recurrence.name}
      detail={recurrence.rule}
      detailTitle={recurrence.rule}
      badges={[
        <Chip key="note" icon={recurrence.paused ? 'clock' : 'calendar'}>
          {recurrence.note}
        </Chip>,
      ]}
      menu={
        <OverflowMenu
          label={`Ações de ${recurrence.name}`}
          items={[{ key: 'edit', label: 'Editar', icon: 'edit' }]}
          onAction={() => onEdit(recurrence.recurrenceId)}
        />
      }
      actions={
        recurrence.paused ? (
          <Button
            size="sm"
            variant="secondary"
            onPress={() => onResume(recurrence.recurrenceId, recurrence.name)}
          >
            Retomar
          </Button>
        ) : undefined
      }
      className={recurrence.pending ? 'pointer-events-none opacity-50' : undefined}
    />
  );
}
