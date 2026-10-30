import { ContentSkeleton } from '@fincheck/ui';

import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Contas e cartões: header and skeleton until the accounts feature brings its data. */
export function AccountListPage() {
  return (
    <ScreenFrame screen={SCREENS.accounts}>
      <ContentSkeleton variant="cards" />
    </ScreenFrame>
  );
}
