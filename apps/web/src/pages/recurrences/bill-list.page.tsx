import { ContentSkeleton } from '@fincheck/ui';

import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Recorrentes › A pagar e receber: header, sub-tabs and skeleton until the bills feature exists. */
export function BillListPage() {
  return (
    <ScreenFrame screen={SCREENS.bills}>
      <ContentSkeleton variant="list" />
    </ScreenFrame>
  );
}
