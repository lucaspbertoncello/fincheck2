import { Icon } from '#/components/icons/icon.component.tsx';
import { OverflowMenu } from '#/components/menus/overflow-menu.component.tsx';
import type { TagItem } from '#/components/categories/tag-item.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type TagChipProps = {
  tag: TagItem;
  onRename: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  className?: string;
};

/**
 * Tag chip (components.md 15): "# nome", the count of transactions and the "…" menu. 32 px tall
 * on the desktop and 44 on the phone. An archived tag is dimmed and offers "Desarquivar" instead of "Arquivar".
 */
export function TagChip({ tag, onRename, onArchive, onRestore, className }: TagChipProps) {
  const archived = tag.archived === true;

  return (
    <span
      className={cx(
        'inline-flex h-ctl-touch items-center gap-s8 rounded-capsule bg-subtle pr-s4 pl-s12 text-label whitespace-nowrap text-fg-primary lg:h-8',
        archived && 'text-fg-secondary',
        className,
      )}
    >
      <Icon name="hash" size="sm" className="text-fg-secondary" />
      <span className={archived ? 'font-plain' : 'font-emphasis'}>{tag.name}</span>
      <span className="text-meta text-fg-secondary tabular-nums">
        {tag.transactionCount}
        <span className="sr-only"> transações</span>
      </span>
      <OverflowMenu
        label={`Ações da tag ${tag.name}`}
        className="lg:size-7!"
        items={[
          { key: 'rename', label: 'Renomear', icon: 'edit' },
          archived
            ? { key: 'restore', label: 'Desarquivar', icon: 'history' }
            : { key: 'archive', label: 'Arquivar', icon: 'archive' },
        ]}
        onAction={(key) => {
          if (key === 'rename') onRename(tag.id);
          else if (key === 'restore') onRestore(tag.id);
          else onArchive(tag.id);
        }}
      />
    </span>
  );
}
