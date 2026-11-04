import { Button } from '@fincheck/ui';

type FolderRowProps = {
  folderPath: string;
  onChange: () => void;
};

/** The backup folder: its path as plain text and "Trocar pasta". */
export function FolderRow({ folderPath, onChange }: FolderRowProps) {
  return (
    <div className="flex items-center justify-between gap-s16 max-lg:flex-col max-lg:items-start">
      <p className="min-w-0 text-label font-plain break-all text-fg-secondary tabular-nums">
        {folderPath}
      </p>
      <Button variant="tertiary" size="sm" icon="folder" onPress={onChange}>
        Trocar pasta
      </Button>
    </div>
  );
}
