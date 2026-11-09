import { Fragment } from 'react';
import { Button, Menu, MenuItem, MenuTrigger, Popover, Separator } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';
import type { OverflowMenuItem } from '#/components/menus/overflow-menu.type.ts';

type OverflowMenuProps = {
  /** Accessible name of the "…" button and the menu ("Ações da transação"). */
  label: string;
  items: OverflowMenuItem[];
  onAction: (key: string) => void;
  className?: string;
};

/**
 * Generic "…" menu (components.md 15): 40 px button (44 on the phone), panel 224 wide (240 on the
 * phone) with 44 px items, dividers between groups, blurred. Headless React Aria menu.
 */
export function OverflowMenu({ label, items, onAction, className }: OverflowMenuProps) {
  return (
    <MenuTrigger>
      <Button
        aria-label={label}
        className={cx(
          'focus-ring grid size-ctl-touch shrink-0 cursor-pointer place-items-center rounded-capsule text-fg-secondary lg:size-ctl-tab',
          'transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle-hover data-[hovered]:text-fg-primary data-[pressed]:bg-subtle-hover',
          className,
        )}
      >
        <Icon name="more" size="lg" />
      </Button>
      <Popover
        placement="bottom end"
        offset={4}
        className="popover-enter w-max min-w-56 max-w-[calc(100vw-2rem)] rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover)"
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
                isDisabled={item.isDisabled}
                className={cx(
                  'flex min-h-ctl-touch cursor-pointer items-center gap-s12 rounded-input px-s12 text-list whitespace-nowrap outline-none',
                  'data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[focused]:bg-subtle data-[hovered]:bg-subtle',
                  item.danger ? 'text-loss' : 'text-fg-primary',
                )}
              >
                {item.icon ? (
                  <Icon
                    name={item.icon}
                    size="md"
                    className={item.danger ? 'text-loss' : 'text-fg-secondary'}
                  />
                ) : null}
                {item.label}
              </MenuItem>
            </Fragment>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
