import { Button, type ButtonProps } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type AddAccountCardProps = Pick<ButtonProps, 'onPress'> & {
  /** "Conectar outra conta". */
  title: string;
  /** "Banco do Brasil, Inter, Itaú, Caixa e outros 6". */
  subtitle: string;
  className?: string;
};

/** "Conectar outra conta": dashed 2 px border, no fill, centered (components.md 3.5). */
export function AddAccountCard({ title, subtitle, onPress, className }: AddAccountCardProps) {
  return (
    <Button
      onPress={onPress}
      className={cx(
        'flex min-h-40 cursor-pointer flex-col items-center justify-center gap-s8 rounded-panel border-2 border-dashed border-line p-s16 text-center outline-none transition-colors duration-(--duration-fast) focus-ring data-[hovered]:bg-subtle',
        className,
      )}
    >
      <Icon name="plug" size="lg" className="text-fg-secondary" />
      <span className="font-title text-body font-emphasis text-fg-primary">{title}</span>
      <span className="text-meta text-fg-secondary">{subtitle}</span>
    </Button>
  );
}
