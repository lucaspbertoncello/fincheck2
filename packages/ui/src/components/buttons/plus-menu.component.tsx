import { Fragment } from 'react';
import { Menu, MenuItem, MenuTrigger, Popover, Separator, Text } from 'react-aria-components';

import { PlusButton } from '#/components/buttons/plus-button.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { PlusMenuItem } from '#/components/buttons/plus-menu.type.ts';

type PlusMenuProps = {
  /** Accessible name of the "+" on this screen ("Criar"). */
  label: string;
  items: PlusMenuItem[];
  onAction: (key: string) => void;
  onOpenChange?: (isOpen: boolean) => void;
};

/**
 * The "+" with its menu of general actions (components.md 1.3). Headless React Aria menu: opens
 * with Enter, Space or arrow down, moves with the arrows, closes with Esc. It opens upward from the
 * floating "+" (bottom right of the window), aligned to its right edge. On mobile it becomes a wide
 * sheet 16 px from each side edge.
 */
export function PlusMenu({ label, items, onAction, onOpenChange }: PlusMenuProps) {
  return (
    <MenuTrigger onOpenChange={onOpenChange}>
      <PlusButton label={label} />
      <Popover
        placement="top end"
        offset={12}
        className="popover-enter w-menu origin-bottom-right! overflow-y-auto rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover) max-lg:inset-x-s16! max-lg:w-auto!"
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
