import { ToggleButton } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type HideValuesButtonProps = {
  /** True when the values are hidden (the closed eye shows). */
  isHidden: boolean;
  onToggle: () => void;
  className?: string;
};

// Eyelid: the leaving layer closes to a line in the middle, then the other one opens from it.
const LAYER =
  'absolute inset-0 grid place-items-center transition-transform duration-(--duration-instant) ease-(--ease-eye)';

/** The eye beside "Livre até o fim do mês": hides every money value in the app (components.md 8). */
export function HideValuesButton({ isHidden, onToggle, className }: HideValuesButtonProps) {
  return (
    <ToggleButton
      isSelected={isHidden}
      onChange={onToggle}
      aria-label={isHidden ? 'Mostrar valores' : 'Ocultar valores'}
      className={cx(
        'relative -m-s8 size-ctl-touch shrink-0 cursor-pointer rounded-capsule text-fg-secondary outline-none',
        'data-[hovered]:text-fg-primary data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand',
        className,
      )}
    >
      <span
        className={cx(LAYER, isHidden ? 'scale-y-0' : 'scale-y-100 delay-(--duration-instant)')}
      >
        <Icon name="eye" size="lg" />
      </span>
      <span
        className={cx(LAYER, isHidden ? 'scale-y-100 delay-(--duration-instant)' : 'scale-y-0')}
      >
        <Icon name="eye-off" size="lg" />
      </span>
    </ToggleButton>
  );
}
