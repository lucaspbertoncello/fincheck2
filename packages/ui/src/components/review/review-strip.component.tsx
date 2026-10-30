import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type ReviewStripProps = {
  /** Transactions waiting. With none the strip is not drawn. */
  count: number;
  onReview: () => void;
  className?: string;
};

/**
 * "12 para revisar" strip inside Transações (components.md 11.2): a 52 px pill on the soft accent,
 * one line, with the small primary button "Revisar".
 */
export function ReviewStrip({ count, onReview, className }: ReviewStripProps) {
  if (count <= 0) return null;

  return (
    <div
      className={cx(
        'flex h-13 items-center gap-s12 rounded-capsule bg-brand-weak py-s8 pr-s8 pl-s16',
        className,
      )}
    >
      <Icon name="inbox" size="base" className="text-brand" />
      <p className="min-w-0 flex-1 truncate text-list text-fg-primary">
        <span className="tabular-nums">{count}</span> para revisar
      </p>
      <Button size="sm" onPress={onReview}>
        Revisar
      </Button>
    </div>
  );
}
