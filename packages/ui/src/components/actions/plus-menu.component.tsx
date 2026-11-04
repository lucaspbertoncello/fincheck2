import { Fragment, type ReactNode } from 'react';
import { Menu, MenuItem, MenuTrigger, Popover, Separator, Text } from 'react-aria-components';

import { PlusButton } from '#/components/actions/plus-button.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';

export type PlusMenuItem = {
  key: string;
  label: string;
  description?: string;
  icon: IconName;
  /** Draws the divider before this item. */
  separatorBefore?: boolean;
};

type PlusMenuProps = {
  /** Accessible name of the "+" on this screen ("Criar"). */
  label: string;
  items: PlusMenuItem[];
  onAction: (key: string) => void;
  /** Rail form of the "+" (see `PlusButton`), with its visible text in `children`. */
  compact?: boolean;
  children?: ReactNode;
  /** Where the menu opens from the "+": under it on the top bar, beside it on the rail. */
  placement?: 'bottom end' | 'right top';
  onOpenChange?: (isOpen: boolean) => void;
};

/**
 * The "+" with its menu of general actions (components.md 1.3). Headless React Aria menu: opens
 * with Enter, Space or arrow down, moves with the arrows, closes with Esc. On mobile it becomes a
 * wide sheet 16 px from each edge.
 */
export function PlusMenu({
  label,
  items,
  onAction,
  compact,
  children,
  placement = 'bottom end',
  onOpenChange,
}: PlusMenuProps) {
  return (
    <MenuTrigger onOpenChange={onOpenChange}>
      <PlusButton label={label} compact={compact}>
        {children}
      </PlusButton>
      <Popover
        placement={placement}
        offset={placement === 'right top' ? 16 : 8}
        className={`popover-enter ${placement === 'right top' ? 'origin-top-left!' : ''} w-menu rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover) max-lg:inset-x-s16! max-lg:w-auto!`}
      >
        <Menu
          aria-label={label}
          onAction={(key) => onAction(String(key))}
          className="p-s8 outline-none"
        >
          {items.map((item) => (
            <Fragment key={item.key}>
              {item.separatorBefore ? (
                <Separator className="mx-s12 my-s8 h-px bg-(--color-border-default)" />
              ) : null}
              <MenuItem
                id={item.key}
                textValue={item.label}
                className="flex min-h-12 cursor-pointer items-center gap-s12 rounded-input px-s12 py-s8 text-list text-fg-primary outline-none data-[focused]:bg-subtle data-[hovered]:bg-subtle"
              >
                <Icon name={item.icon} size="md" className="text-fg-secondary" />
                <span className="flex min-w-0 flex-col">
                  <Text slot="label" className="font-plain">
                    {item.label}
                  </Text>
                  {item.description ? (
                    <Text slot="description" className="text-meta text-fg-secondary">
                      {item.description}
                    </Text>
                  ) : null}
                </span>
              </MenuItem>
            </Fragment>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
