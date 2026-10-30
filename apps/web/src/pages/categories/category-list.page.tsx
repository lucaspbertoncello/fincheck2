import { ContentSkeleton } from '@fincheck/ui';

import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Categorias › Categorias: header, sub-tabs and skeleton until the categories feature exists. */
export function CategoryListPage() {
  return (
    <ScreenFrame screen={SCREENS.categories}>
      <ContentSkeleton variant="sections" />
    </ScreenFrame>
  );
}
