import type { ReactNode } from 'react';

import { Collapse } from '#/components/disclosure/collapse.component.tsx';

/** The `gap` of the column the banner sits in; the closed slot cancels it, the open one gives it back. */
const GAP = {
  s24: { track: '-mt-s24', content: 'pt-s24' },
  's16-s24': { track: '-mt-s16 lg:-mt-s24', content: 'pt-s16 lg:pt-s24' },
} as const;

type BannerSlotProps = {
  /** Whether there is something to say. The banner keeps its last text while it folds. */
  isOpen: boolean;
  gap?: keyof typeof GAP;
  children: ReactNode;
};

/**
 * Where a `Banner` that enters after an action goes ("Não deu para…", "Entendi"): it opens in
 * height and opacity with the system `Collapse` instead of appearing, and takes no room closed.
 */
export function BannerSlot({ isOpen, gap = 's24', children }: BannerSlotProps) {
  return (
    <Collapse isOpen={isOpen} trackClassName={GAP[gap].track} contentClassName={GAP[gap].content}>
      {children}
    </Collapse>
  );
}
