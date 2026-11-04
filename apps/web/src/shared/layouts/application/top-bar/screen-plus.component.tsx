import { PlusButton, PlusMenu } from '@fincheck/ui';

import { PLUS_MENU_ITEMS } from '#/shared/layouts/application/top-bar/plus-menu-items.constant.ts';
import { usePlusAction } from '#/shared/layouts/application/top-bar/use-plus-action.hook.ts';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

type ScreenPlusProps = {
  screen: ScreenDefinition;
  monthParam: string | undefined;
};

/** The "+" of a screen (the floating button of the shell): its own modal when the screen has one (`direct`), the general menu otherwise. */
export function ScreenPlus({ screen, monthParam }: ScreenPlusProps) {
  const handlePlusAction = usePlusAction(monthParam);

  if (screen.plusMode === 'menu') {
    return (
      <PlusMenu label={screen.plusLabel} items={PLUS_MENU_ITEMS} onAction={handlePlusAction} />
    );
  }

  return (
    <PlusButton
      label={screen.plusLabel}
      onPress={() => screen.plusAction && handlePlusAction(screen.plusAction)}
    />
  );
}
