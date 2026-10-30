import { RecurrenceListViewModel } from '#/features/recurrences/recurrence-list/recurrence-list.viewmodel.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Recorrentes › Recorrências: header, sub-tabs and the recurrences feature. */
export function RecurrenceListPage() {
  return (
    <ScreenFrame screen={SCREENS.recurrences}>
      <RecurrenceListViewModel />
    </ScreenFrame>
  );
}
