import { FriendList } from '#/features/bills/friend-list/friend-list.viewmodel.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Recorrentes › Amigos: header, sub-tabs and the friend debts feature. */
export function FriendListPage() {
  return (
    <ScreenFrame screen={SCREENS.friends}>
      <FriendList />
    </ScreenFrame>
  );
}
