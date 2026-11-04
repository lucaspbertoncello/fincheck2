import { PlusButton, PlusMenu } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { PLUS_MENU_ITEMS } from '#/shared/layouts/application/top-bar/plus-menu-items.constant.ts';
import { usePlusAction } from '#/shared/layouts/application/top-bar/use-plus-action.hook.ts';
import type { ScreenDefinition } from '#/shared/types/screen.type.ts';

type ScreenPlusProps = {
  screen: ScreenDefinition;
  monthParam: string | undefined;
  /** Rail form: the circle grows into a pill with `children` as its text. */
  compact?: boolean;
  children?: ReactNode;
  placement?: 'bottom end' | 'right top';
  onMenuOpenChange?: (isOpen: boolean) => void;
};

/** The "+" of a screen: its own modal when the screen has one (`direct`), the general menu otherwise. */
export function ScreenPlus({
  screen,
  monthParam,
  compact,
  children,
  placement,
  onMenuOpenChange,
}: ScreenPlusProps) {
  const handlePlusAction = usePlusAction(monthParam);

  if (screen.plusMode === 'menu') {
    return (
      <PlusMenu
        label={screen.plusLabel}
        items={PLUS_MENU_ITEMS}
        onAction={handlePlusAction}
        compact={compact}
        placement={placement}
        onOpenChange={onMenuOpenChange}
      >
        {children}
      </PlusMenu>
    );
  }

  return (
    <PlusButton
      label={screen.plusLabel}
      compact={compact}
      onPress={() => screen.plusAction && handlePlusAction(screen.plusAction)}
    >
      {children}
    </PlusButton>
  );
}
