import { ContentSkeleton } from '@fincheck/ui';

import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Para revisar: header and skeleton until the review feature brings the queue. */
export function ReviewQueuePage() {
  return (
    <ScreenFrame screen={SCREENS.review}>
      <ContentSkeleton variant="list" />
    </ScreenFrame>
  );
}
