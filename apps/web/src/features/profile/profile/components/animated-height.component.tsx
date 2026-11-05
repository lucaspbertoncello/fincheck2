import { motion, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type AnimatedHeightProps = {
  children: ReactNode;
};

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * A box that follows the height of its content with a transition (240 ms, `duration.slide`) instead
 * of jumping: the year map is short and the month calendar is tall, and the card must not snap when
 * the person switches between them. The real element grows or shrinks, nothing is stretched; the
 * content is clipped to it while it moves (with a 4 px gutter so a focus ring is not cut). Reduced
 * motion changes the height at once. Without `ResizeObserver` (tests) the height is natural.
 */
export function AnimatedHeight({ children }: AnimatedHeightProps) {
  const reduced = useReducedMotion();
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    setHeight(content.offsetHeight);
    const observer = new ResizeObserver(() => setHeight(content.offsetHeight));
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={height === null ? undefined : { height }}
      transition={{ duration: reduced ? 0 : 0.24, ease: EASE }}
      className="-m-s4 overflow-hidden"
    >
      <div ref={contentRef} className="p-s4">
        {children}
      </div>
    </motion.div>
  );
}
