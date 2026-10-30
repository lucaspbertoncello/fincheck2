import { ContentSkeleton } from '@fincheck/ui';

import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Transações: header and skeleton until the transactions feature brings its data. */
export function TransactionListPage() {
  return (
    <ScreenFrame screen={SCREENS.transactions}>
      <ContentSkeleton variant="list" />
    </ScreenFrame>
  );
}
