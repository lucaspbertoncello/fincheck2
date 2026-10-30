import type { ReactNode } from 'react';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

/** "Ok" line: green check (18) and a 14 px secondary text ("Soma confere"). */
export function OkLine({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('flex items-center gap-s8 text-label text-fg-secondary', className)}>
      <Icon name="check" size="md" className="text-gain" />
      <span>{children}</span>
    </p>
  );
}
