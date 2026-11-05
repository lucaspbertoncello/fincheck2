import { useEffect, useRef, useState, type ReactNode, type TransitionEvent } from 'react';

import { cx } from '#/utils/class-names.util.ts';

type CollapseProps = {
  /** Open or closed. The caller owns the state and the trigger (`aria-expanded`, `aria-controls`). */
  isOpen: boolean;
  /** Goes on the content, so the trigger can point its `aria-controls` at it. */
  id?: string;
  children: ReactNode;
  /**
   * The outer track. For a Collapse that sits among siblings separated by a `gap`: cancel the gap
   * with the same negative margin (`-mt-s16`) and give the content the same `pt-s16`, so closed
   * it takes no room at all.
   */
  trackClassName?: string;
  /** The clipping box. Anything that must not be cut (a focus ring) bleeds through the 4 px gutter. */
  className?: string;
  /** The content box: put the space between the trigger and the content here (`pt-*`), never outside. */
  contentClassName?: string;
  /**
   * Keep the children mounted while closed. By default they mount when it opens and leave when the
   * closing finishes, so a field inside takes its `autoFocus` on open and heavy lists cost nothing
   * while closed. Turn it on when the children hold state that must survive (a form).
   */
  keepMounted?: boolean;
  /** The opening finished growing. Receives the track, to scroll it into view if it is cut off. */
  onOpened?: (track: HTMLElement) => void;
};

/**
 * Every element that appears or goes away on a user's action uses this (motion.md, "Expansíveis"):
 * the height grows from 0 to its natural size (`grid-template-rows` 0fr → 1fr, no measuring) while
 * the opacity goes 0 → 1, 240 ms (`duration.slide`) on `ease.standard`. Closed, the content is
 * `inert` and `aria-hidden`: no focus, not read. `prefers-reduced-motion` cuts it to 1 ms (the
 * global rule), so the change is instant.
 *
 * Space belongs inside (`contentClassName`), never as a margin or a parent `gap` around it, or a
 * closed Collapse would leave a hole.
 */
export function Collapse({
  isOpen,
  id,
  children,
  className,
  trackClassName,
  contentClassName,
  keepMounted = false,
  onOpened,
}: CollapseProps) {
  const [present, setPresent] = useState(isOpen);
  if (isOpen && !present) setPresent(true);
  // The children that were open last: while it closes they stay on screen even if the caller has
  // already emptied them (`{preview ? <X /> : null}`), so the height can fold instead of snapping.
  const [kept, setKept] = useState(children);
  if (isOpen && kept !== children) setKept(children);
  const shown = keepMounted || isOpen ? children : present ? kept : null;

  const contentRef = useRef<HTMLDivElement>(null);

  // Closing takes the focus out of the content (it becomes `inert`): a field or a popover that
  // was open inside lets go now, not when the fold ends.
  useEffect(() => {
    const content = contentRef.current;
    if (!isOpen && content?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
  }, [isOpen]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'grid-template-rows') return;
    if (isOpen) onOpened?.(event.currentTarget);
    else setPresent(false);
  };

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      className={cx(
        'grid transition-[grid-template-rows] duration-(--duration-slide) ease-(--ease-standard)',
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        trackClassName,
      )}
    >
      <div className={cx('-mx-s4 min-h-0 overflow-hidden', className)}>
        <div
          ref={contentRef}
          id={id}
          inert={!isOpen}
          aria-hidden={isOpen ? undefined : true}
          className={cx(
            'px-s4 transition-opacity duration-(--duration-slide) ease-(--ease-standard)',
            isOpen ? 'opacity-100' : 'opacity-0',
            contentClassName,
          )}
        >
          {shown}
        </div>
      </div>
    </div>
  );
}
