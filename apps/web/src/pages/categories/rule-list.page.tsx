import { ContentSkeleton } from '@fincheck/ui';

import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Categorias › Regras: header, sub-tabs and skeleton until the rules feature exists. */
export function RuleListPage() {
  return (
    <ScreenFrame screen={SCREENS.rules}>
      <ContentSkeleton variant="list" />
    </ScreenFrame>
  );
}
