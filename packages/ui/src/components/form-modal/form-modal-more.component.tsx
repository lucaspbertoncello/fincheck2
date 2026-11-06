import { useId, useState, type ReactNode } from 'react';

import { Button } from '#/components/buttons/button.component.tsx';
import { Collapse } from '#/components/disclosure/collapse.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type FormModalMoreProps = {
  /** The toggle ("Mais opções"). */
  label?: string;
  /** What is inside, while closed ("2 preenchidas"): the reader knows without opening. */
  summary?: string;
  /** Controlled state. Leave out to let the component keep it. */
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** A field inside has an error: stays open so the error is never hidden. */
  hasError?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Progressive disclosure for the fields that are rarely needed ("Mais opções"): a toggle row in the
 * look of a group label (accent text, chevron that turns, hairline to the edge) and a panel that
 * opens with the system `Collapse` (height and opacity). The only layout motion of the modal, on
 * purpose: the panel must take its height. Closed, the panel is `inert` (no focus, not read) but
 * stays mounted, so the fields keep what was typed.
 *
 * Placement rule (components.md 13.6): what "Mais opções" reveals enters last, so nothing that was
 * on screen moves. Put it as the last child of the body (or of the last column of a
 * `FormModalSplit`), never before a group that follows it. When it opens and the revealed content
 * ends up outside the visible part of the body, the body scrolls down to it (smoothly, instantly
 * under `prefers-reduced-motion`); the focus stays on the toggle.
 */
export function FormModalMore({
  label = 'Mais opções',
  summary,
  isOpen,
  defaultOpen = false,
  onOpenChange,
  hasError = false,
  children,
  className,
}: FormModalMoreProps) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const panelId = useId();
  const open = (isOpen ?? innerOpen) || hasError;

  const toggle = () => {
    const next = !open;
    setInnerOpen(next);
    onOpenChange?.(next);
  };

  /** The panel finished growing: bring the revealed content into view only if it is cut off. */
  const revealIfCut = (track: HTMLElement) => {
    if (typeof track.scrollIntoView !== 'function') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    track.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section className={cx('flex min-w-0 flex-col', className)}>
      <div className="flex items-center gap-s12">
        <Button
          variant="tertiary"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onPress={toggle}
          className="-ml-s12 gap-s4"
        >
          <Icon
            name="chevron-right"
            size="sm"
            className={cx(
              'transition-transform duration-(--duration-slide) ease-(--ease-standard)',
              open && 'rotate-90',
            )}
          />
          {label}
        </Button>
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        {summary && !open ? <span className="text-meta text-fg-tertiary">{summary}</span> : null}
      </div>
      <Collapse
        isOpen={open}
        id={panelId}
        keepMounted
        onOpened={revealIfCut}
        contentClassName="flex flex-col gap-s16 pt-s16 pb-s4"
      >
        {children}
      </Collapse>
    </section>
  );
}
