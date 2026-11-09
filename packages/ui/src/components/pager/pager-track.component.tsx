import type { ReactNode, Ref } from 'react';

type PagerTrackProps = {
  /** From `usePagedScroll`: the arrows and the finger drive this same element. */
  trackRef: Ref<HTMLDivElement>;
  /** What the strip holds ("Cartões de crédito"), for the screen reader. */
  label: string;
  /** The slides: each child is one slide, drawn as tall as the tallest. */
  children: ReactNode;
};

/**
 * A horizontal strip of slides that snaps: one slide per page on the phone, two per page from the
 * desktop width, with the same gaps as the grids of the screen. No scroll bar; a finger drags it,
 * the arrows glide it. The 4 px of padding keep the shadows of the slides from being cut.
 */
export function PagerTrack({ trackRef, label, children }: PagerTrackProps) {
  return (
    <div
      ref={trackRef}
      role="group"
      aria-label={label}
      tabIndex={0}
      className="focus-ring -m-s4 grid auto-cols-[100%] grid-flow-col snap-x snap-mandatory scroll-px-s4 gap-s16 overflow-x-auto overscroll-x-contain p-s4 scrollbar-none lg:auto-cols-[calc((100%-var(--spacing-s24))/2)] lg:gap-s24 [&>*]:snap-start"
    >
      {children}
    </div>
  );
}
