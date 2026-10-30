import { Button } from 'react-aria-components';

import { TagChip } from '#/components/categories/tag-chip.component.tsx';
import type { TagItem } from '#/components/categories/tag-item.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type TagListProps = {
  tags: TagItem[];
  /** Accessible name of the list ("Tags"). */
  label: string;
  onRename: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  /** Shows the dashed "Nova tag" pill at the end when given. */
  onCreate?: () => void;
  createLabel?: string;
  className?: string;
};

/** The tags as a wrapping row of `TagChip`, ending with the dashed "Nova tag" pill. */
export function TagList({
  tags,
  label,
  onRename,
  onArchive,
  onRestore,
  onCreate,
  createLabel = 'Nova tag',
  className,
}: TagListProps) {
  return (
    <ul aria-label={label} className={cx('flex flex-wrap items-center gap-s12', className)}>
      {tags.map((tag) => (
        <li key={tag.id}>
          <TagChip tag={tag} onRename={onRename} onArchive={onArchive} onRestore={onRestore} />
        </li>
      ))}
      {onCreate ? (
        <li>
          <Button
            onPress={onCreate}
            className="focus-ring inline-flex h-ctl-touch cursor-pointer items-center gap-s8 rounded-capsule border border-dashed border-fg-tertiary px-s16 text-label text-fg-primary transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle lg:h-8 lg:px-s12"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              className="size-icon-sm text-fg-secondary"
              fill="none"
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {createLabel}
          </Button>
        </li>
      ) : null}
    </ul>
  );
}
