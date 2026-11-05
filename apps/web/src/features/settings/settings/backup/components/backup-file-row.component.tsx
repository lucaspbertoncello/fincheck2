import { Button, CategoryIcon, Chip, ListRow } from '@fincheck/ui';

import type { BackupFileItem } from '#/features/settings/settings/backup/types/backup-file-item.type.ts';

type BackupFileRowProps = {
  file: BackupFileItem;
  isDisabled: boolean;
  onRestore: () => void;
};

/**
 * One backup of the list on the standard list row: when it was made (with "Mais recente"), its size
 * as the detail and "Restaurar" on the strip, which only asks first.
 */
export function BackupFileRow({ file, isDisabled, onRestore }: BackupFileRowProps) {
  return (
    <ListRow
      mark={<CategoryIcon icon="history" />}
      name={file.moment}
      badges={
        file.isLatest
          ? [
              <Chip key="latest" tone="accent">
                Mais recente
              </Chip>,
            ]
          : undefined
      }
      detail={<span className="tabular-nums">{file.size}</span>}
      detailTitle={file.size}
      actions={
        <Button variant="tertiary" size="sm" isDisabled={isDisabled} onPress={onRestore}>
          Restaurar <span className="sr-only">o backup de {file.moment}</span>
        </Button>
      }
      className="border-t border-line first:border-t-0"
    />
  );
}
