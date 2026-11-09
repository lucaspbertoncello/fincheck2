import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/** Pixels of slack when deciding that the track is at an end (fractional scroll positions). */
const EDGE_SLACK = 2;

type Edges = { atStart: boolean; atEnd: boolean };

/** The edges of the track now; the same object when nothing changed, so no render happens. */
function readEdges(track: HTMLElement, current: Edges): Edges {
  const atStart = track.scrollLeft <= EDGE_SLACK;
  const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - EDGE_SLACK;
  return current.atStart === atStart && current.atEnd === atEnd ? current : { atStart, atEnd };
}

/**
 * The state of a horizontal scroll-snap track that is paged by arrows: whether it can still go
 * back or forward, and the two moves, one page (the visible width) at a time. The track keeps its
 * own scrolling, so a finger or a trackpad drag also pages it and the arrows follow. Reduced
 * motion jumps instead of gliding. `trackRef` is a callback ref, so the track may come and go.
 */
export function usePagedScroll() {
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState<Edges>({ atStart: true, atEnd: false });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!track) return;
    const update = () => setEdges((current) => readEdges(track, current));
    track.addEventListener('scroll', update, { passive: true });
    // The first reading comes from the size observer, which reports once when it starts; it also
    // follows a resize of the window. The content can change under a still track (a card was added
    // or archived): the mutation observer reads again then.
    const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    sizes?.observe(track);
    const children = new MutationObserver(update);
    children.observe(track, { childList: true });
    return () => {
      track.removeEventListener('scroll', update);
      sizes?.disconnect();
      children.disconnect();
    };
  }, [track]);

  function go(direction: -1 | 1) {
    if (!track) return;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap) || 0;
    const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    track.scrollBy({
      left: direction * (track.clientWidth - padding + gap),
      behavior: reduced ? 'auto' : 'smooth',
    });
  }

  return {
    trackRef: setTrack,
    canGoBack: !edges.atStart,
    canGoForward: !edges.atEnd,
    goBack: () => go(-1),
    goForward: () => go(1),
  };
}
