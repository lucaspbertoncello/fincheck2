import { Button } from '@fincheck/ui';

type LoadMoreProps = {
  onWatchEnd: (node: HTMLDivElement | null) => void;
  onLoadMore: () => void;
  loading: boolean;
};

/**
 * End of a long list: reaching it loads the next page; the button does the same by hand. The
 * button has a fixed width, so the spinner that shows while the page loads does not resize it.
 * Transações and the category page share it.
 */
export function LoadMore({ onWatchEnd, onLoadMore, loading }: LoadMoreProps) {
  return (
    <div ref={onWatchEnd} className="flex justify-center">
      <Button variant="secondary" onPress={onLoadMore} loading={loading} className="w-44">
        Mostrar mais
      </Button>
    </div>
  );
}
