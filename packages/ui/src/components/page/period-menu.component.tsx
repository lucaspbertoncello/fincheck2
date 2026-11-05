import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

export type PeriodOption = {
  key: string;
  label: string;
};

export type PeriodMenuProps = {
  options: readonly PeriodOption[];
  /** The key of the chosen option. */
  value: string;
  onChange: (key: string) => void;
  /** The key that means "the month of the picker"; any other choice lights the button. */
  monthKey: string;
};

/**
 * The period button next to the month picker: "Mês ▾", "12 meses ▾"... Its width is that of the
 * longest option (an invisible sizer holds them all), so choosing never moves the picker. Any
 * period but the month paints it in the brand tint, so a wider view is never mistaken for a month.
 * The menu is the headless React Aria one, with the chosen option checked.
 */
export function PeriodMenu({ options, value, onChange, monthKey }: PeriodMenuProps) {
  const current = options.find((option) => option.key === value) ?? options[0];
  const isWide = value !== monthKey;

  return (
    <MenuTrigger>
      <Button
        aria-label={`Período: ${current?.label ?? ''}`}
        className={cx(
          'focus-ring flex h-ctl-sm shrink-0 cursor-pointer items-center gap-s4 rounded-capsule pr-s8 pl-s12 text-label whitespace-nowrap transition-colors duration-(--duration-fast) lg:h-8 lg:text-list',
          isWide
            ? 'bg-brand-weak text-brand'
            : 'bg-subtle text-fg-secondary data-[hovered]:text-fg-primary data-[pressed]:text-fg-primary',
        )}
      >
        <span aria-hidden="true" className="grid">
          {options.map((option) => (
            <span key={option.key} className="invisible col-start-1 row-start-1">
              {option.label}
            </span>
          ))}
          <span className="col-start-1 row-start-1 text-left">{current?.label}</span>
        </span>
        <Icon name="chevron-down" size="sm" />
      </Button>
      <Popover
        placement="bottom end"
        offset={4}
        className="popover-enter w-max min-w-44 rounded-panel border border-line bg-menu shadow-(--shadow-menu) backdrop-blur-(--blur-popover)"
      >
        <Menu
          aria-label="Período"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[value]}
          onSelectionChange={(keys) => {
            const [key] = [...keys];
            if (key !== undefined) onChange(String(key));
          }}
          className="p-s8 outline-none"
        >
          {options.map((option) => (
            <MenuItem
              key={option.key}
              id={option.key}
              textValue={option.label}
              className="flex min-h-ctl-touch cursor-pointer items-center justify-between gap-s12 rounded-input px-s12 text-list whitespace-nowrap text-fg-primary outline-none data-[focused]:bg-subtle data-[hovered]:bg-subtle lg:min-h-ctl-tab"
            >
              {({ isSelected }) => (
                <>
                  {option.label}
                  <Icon
                    name="check"
                    size="md"
                    className={isSelected ? 'text-brand' : 'invisible'}
                  />
                </>
              )}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
