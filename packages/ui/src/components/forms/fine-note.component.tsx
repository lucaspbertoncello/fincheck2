import type { ReactNode } from 'react';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type FineNoteProps = {
  icon: IconName;
  children: ReactNode;
  className?: string;
};

/** Fine note: 16 px icon and 13 px secondary text, for hints that need no box. */
export function FineNote({ icon, children, className }: FineNoteProps) {
  return (
    <p className={cx('flex items-start gap-s8 text-meta text-fg-secondary', className)}>
      <Icon name={icon} size="sm" className="mt-px" />
      <span>{children}</span>
    </p>
  );
}
