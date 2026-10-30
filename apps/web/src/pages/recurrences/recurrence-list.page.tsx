import { ContentSkeleton } from '@fincheck/ui';

import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Recorrentes › Recorrências: header, sub-tabs and skeleton until the recurrences feature exists. */
export function RecurrenceListPage() {
  return (
    <ScreenFrame screen={SCREENS.recurrences}>
      <ContentSkeleton variant="overview" />
    </ScreenFrame>
  );
}
