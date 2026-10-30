import { Button, Heading } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type ModalHeaderProps = {
  /** Names the dialog for assistive technology (20 / 550, Fustat). */
  title: string;
  /** One line under the title (14, secondary). */
  subtitle?: string;
  /** The "x" button (44). */
  showClose?: boolean;
  className?: string;
};

/**
 * Title, subtitle and "x" of a modal (components.md 13.2). Goes inside `ModalFrame`; the close
 * button uses the dialog's `close` slot, so it needs no callback.
 */
export function ModalHeader({ title, subtitle, showClose = true, className }: ModalHeaderProps) {
  return (
    <header className={cx('flex items-start justify-between gap-s16', className)}>
      <div className="flex min-w-0 flex-col gap-s4">
        <Heading
          slot="title"
          className="font-title text-xl leading-(--line-height-title) font-heading text-fg-primary"
        >
          {title}
        </Heading>
        {subtitle ? <p className="text-label text-fg-secondary">{subtitle}</p> : null}
      </div>
      {showClose ? (
        <Button
          slot="close"
          aria-label="Fechar"
          className="focus-ring -mt-s8 -mr-s8 grid size-ctl-touch shrink-0 cursor-pointer place-items-center rounded-capsule text-fg-secondary transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle data-[hovered]:text-fg-primary data-[pressed]:bg-subtle"
        >
          <Icon name="close" size="base" />
        </Button>
      ) : null}
    </header>
  );
}
