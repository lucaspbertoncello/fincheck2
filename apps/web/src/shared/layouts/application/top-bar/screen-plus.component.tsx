import { PlusButton, PlusMenu } from '@fincheck/ui';

import { PLUS_MENU_ITEMS } from '#/shared/layouts/application/top-bar/plus-menu-items.constant.ts';
import { usePlusAction } from '#/shared/layouts/application/top-bar/use-plus-action.hook.ts';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

type ScreenPlusProps = {
  screen: ScreenDefinition;
  monthParam: string | undefined;
  /** Rail form: a 40 px circle with a tip carrying the name. */
  compact?: boolean;
  placement?: 'bottom end' | 'right top';
};

/** The "+" of a screen: its own modal when the screen has one (`direct`), the general menu otherwise. */
export function ScreenPlus({ screen, monthParam, compact, placement }: ScreenPlusProps) {
  const handlePlusAction = usePlusAction(monthParam);

  if (screen.plusMode === 'menu') {
    return (
      <PlusMenu
        label={screen.plusLabel}
        items={PLUS_MENU_ITEMS}
        onAction={handlePlusAction}
        compact={compact}
        placement={placement}
      />
    );
  }

  return (
    <PlusButton
      label={screen.plusLabel}
      compact={compact}
      onPress={() => screen.plusAction && handlePlusAction(screen.plusAction)}
    />
  );
}
