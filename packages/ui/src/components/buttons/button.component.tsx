import { Button as AriaButton } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { buttonClassName } from '#/components/buttons/button-class.util.ts';
import type { ButtonProps } from '#/components/buttons/button.type.ts';

/**
 * Pill button (components.md 5.1): primary gradient, secondary outline, tertiary text. Headless
 * React Aria button for focus, keyboard and press; 44 px tall (36 px `sm` with a 44 px touch area).
 */
export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    danger = false,
    loading = false,
    loadingLabel,
    fullWidth = false,
    className,
    onPress,
    isDisabled,
    type = 'button',
    form,
    autoFocus,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
  } = props;

  const icon: IconName | undefined = loading && !props.icon ? 'sync' : props.icon;
  const text = props.iconOnly ? null : loading && loadingLabel ? loadingLabel : props.children;

  return (
    <AriaButton
      type={type}
      form={form}
      autoFocus={autoFocus}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      onPress={onPress}
      isDisabled={isDisabled}
      isPending={loading}
      aria-label={props.iconOnly ? props.label : undefined}
      className={buttonClassName({
        variant,
        size,
        danger,
        iconOnly: Boolean(props.iconOnly),
        fullWidth,
        className,
      })}
    >
      {icon ? (
        <Icon
          name={icon}
          size={props.iconOnly ? 'base' : 'md'}
          className={loading ? 'animate-spin' : undefined}
        />
      ) : null}
      {text}
    </AriaButton>
  );
}
