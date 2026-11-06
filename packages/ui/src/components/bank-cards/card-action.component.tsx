import { Button } from '#/components/buttons/button.component.tsx';
import type { ButtonProps } from '#/components/buttons/button.type.ts';

type CardActionProps = Pick<ButtonProps, 'onPress' | 'isDisabled'> & {
  /** "tertiary" is the quiet text action; "solid" is the primary gradient (failed sync: "Renovar"). */
  variant: 'tertiary' | 'solid';
  children: string;
  className?: string;
};

/** Text button of the bank cards: a small `Button` of `buttons/` (tertiary or primary). */
export function CardAction({ variant, children, className, onPress, isDisabled }: CardActionProps) {
  return (
    <Button
      size="sm"
      variant={variant === 'solid' ? 'primary' : 'tertiary'}
      onPress={onPress}
      isDisabled={isDisabled}
      className={className}
    >
      {children}
    </Button>
  );
}
