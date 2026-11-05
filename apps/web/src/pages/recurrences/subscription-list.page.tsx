import { SubscriptionListViewModel } from '#/features/recurrences/subscription-list/subscription-list.viewmodel.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Recorrentes › Assinaturas: header, sub-tabs and the subscriptions feature. */
export function SubscriptionListPage() {
  return (
    <ScreenFrame screen={SCREENS.subscriptions}>
      <SubscriptionListViewModel />
    </ScreenFrame>
  );
}
