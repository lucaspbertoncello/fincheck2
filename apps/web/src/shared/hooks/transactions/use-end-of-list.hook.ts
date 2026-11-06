import { useEffect, useState } from 'react';

type EndOfListArgs = {
  /** There is a next page to ask for. */
  hasMore: boolean;
  /** A page is on its way: wait for it. */
  loading: boolean;
  /** How many pages are loaded; a new one starts the watch again, in case the end is still in view. */
  pageCount: number;
  onLoadMore: () => void;
};

/** How far ahead of the end of the list the next page is asked for, so it is there before the end is. */
const LOOK_AHEAD = '600px';

/**
 * Asks for the next page when the element at the end of the list gets near the screen. It returns
 * a callback ref for that element. The page lands below what is on screen, so nothing jumps.
 */
export function useEndOfList({ hasMore, loading, pageCount, onLoadMore }: EndOfListArgs) {
  // A state, not a ref object, so the View can pass it as a callback ref.
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinel;
    if (!node || !hasMore || loading || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: `0px 0px ${LOOK_AHEAD} 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // `onLoadMore` is new on every render; the page count is what starts the watch again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinel, hasMore, loading, pageCount]);

  return setSentinel;
}
