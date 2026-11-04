import { Button, Chip } from '@fincheck/ui';

import type { BackupFileItem } from '#/features/settings/settings/backup/types/backup-file-item.type.ts';

type BackupFileRowProps = {
  file: BackupFileItem;
  isDisabled: boolean;
  onRestore: () => void;
};

/** One backup of the list: when it was made, its size and "Restaurar" (which only asks first). */
export function BackupFileRow({ file, isDisabled, onRestore }: BackupFileRowProps) {
  return (
    <li className="flex items-center justify-between gap-s16 border-t border-line py-s12 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-s4">
        <p className="flex flex-wrap items-center gap-x-s8 gap-y-s4 text-body font-emphasis text-fg-primary">
          {file.moment}
          {file.isLatest ? <Chip tone="accent">Mais recente</Chip> : null}
        </p>
        <p className="text-meta text-fg-secondary tabular-nums">{file.size}</p>
      </div>
      <Button
        variant="tertiary"
        size="sm"
        icon="history"
        isDisabled={isDisabled}
        onPress={onRestore}
      >
        Restaurar <span className="sr-only">o backup de {file.moment}</span>
      </Button>
    </li>
  );
}
