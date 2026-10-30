import { useEffect, useState } from 'react';

const PAGE_SIZE = 50;

/**
 * Shows a long month in pages of 50 transactions: the sentinel at the end of the list loads the
 * next page when it scrolls into view, and `loadMore` does the same for the "Mostrar mais" button.
 * The window starts again when `resetKey` changes (another month or filter).
 */
export function useListWindow(totalCount: number, resetKey: string) {
  const [pageState, setWindow] = useState({ key: resetKey, count: PAGE_SIZE });
  const count = pageState.key === resetKey ? pageState.count : PAGE_SIZE;
  const hasMore = count < totalCount;
  // A state, not a ref object, so the View can pass it as a callback ref.
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  function loadMore() {
    setWindow({ key: resetKey, count: count + PAGE_SIZE });
  }

  useEffect(() => {
    const node = sentinel;
    if (!node || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setWindow({ key: resetKey, count: count + PAGE_SIZE });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [sentinel, hasMore, count, resetKey]);

  return { visibleCount: count, hasMore, loadMore, watchEnd: setSentinel };
}
