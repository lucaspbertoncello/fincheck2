import type { ReactNode } from 'react';

type BackupStatusBlockProps = {
  label: string;
  /** The big line: "Ontem às 03:00". */
  value: string;
  /** Under the value: a chip, the size, the reason. */
  children?: ReactNode;
};

/** One of the two facts of the page: the last backup and the next one. */
export function BackupStatusBlock({ label, value, children }: BackupStatusBlockProps) {
  return (
    <div className="flex min-w-0 flex-col gap-s8">
      <p className="text-label text-fg-secondary">{label}</p>
      <p className="font-title text-xl leading-(--line-height-title) font-heading text-fg-primary">
        {value}
      </p>
      <div className="flex min-h-ctl-sm flex-wrap items-center gap-x-s8 gap-y-s4 text-meta text-fg-secondary">
        {children}
      </div>
    </div>
  );
}
