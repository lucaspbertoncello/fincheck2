import { BillList } from '#/features/bills/bill-list/bill-list.viewmodel.tsx';
import { ScreenFrame } from '#/shared/components/page/screen-frame.component.tsx';
import { SCREENS } from '#/shared/constants/screens.constant.ts';

/** Recorrentes › A pagar e receber: header, sub-tabs and the bills feature. */
export function BillListPage() {
  return (
    <ScreenFrame screen={SCREENS.bills}>
      <BillList />
    </ScreenFrame>
  );
}
