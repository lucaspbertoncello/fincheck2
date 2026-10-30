import { ReviewQueueViewModel } from '#/features/review/review-queue/review-queue.viewmodel.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Para revisar: the header, then the review feature. */
export function ReviewQueuePage() {
  return (
    <ScreenFrame screen={SCREENS.review}>
      <ReviewQueueViewModel />
    </ScreenFrame>
  );
}
