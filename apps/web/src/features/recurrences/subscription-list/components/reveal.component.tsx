import { Collapse } from '@fincheck/ui';
import { type ReactNode, useEffect, useState } from 'react';

type RevealProps = {
  /** Whether it is on screen. Flipping it opens or folds the content with the system `Collapse`. */
  show: boolean;
  /** Starts folded and opens on mount: for what arrives after the screen is already there. */
  animateEnter?: boolean;
  /** For a block among siblings split by a `gap`: cancels it while folded (`-mt-s24`). */
  trackClassName?: string;
  /** Space above the content, inside the fold, so a folded one takes no room at all. */
  contentClassName?: string;
  children: ReactNode;
};

/** Everything of this screen that appears or goes away does it through here (motion.md). */
export function Reveal({
  show,
  animateEnter = false,
  trackClassName,
  contentClassName,
  children,
}: RevealProps) {
  const [open, setOpen] = useState(animateEnter ? false : show);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(show));

    return () => cancelAnimationFrame(frame);
  }, [show]);

  return (
    <Collapse isOpen={open} trackClassName={trackClassName} contentClassName={contentClassName}>
      {children}
    </Collapse>
  );
}
