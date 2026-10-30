import { ContentSkeleton } from '@fincheck/ui';

import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Visão geral: header and skeleton until the overview feature brings its data. */
export function OverviewPage() {
  return (
    <ScreenFrame screen={SCREENS.overview}>
      <ContentSkeleton variant="overview" />
    </ScreenFrame>
  );
}
