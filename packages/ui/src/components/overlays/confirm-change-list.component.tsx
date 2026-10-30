import { Icon } from '#/components/icons/icon.component.tsx';
import type { ConfirmChange } from '#/components/overlays/confirm-change.type.ts';

type ConfirmChangeListProps = {
  changes: ConfirmChange[];
};

/** "O que muda": subtle box, radius 12, 16 px icon and 14 px text per line (components.md 13.3). */
export function ConfirmChangeList({ changes }: ConfirmChangeListProps) {
  return (
    <ul className="flex flex-col gap-s8 rounded-input bg-subtle p-s16">
      {changes.map((change) => (
        <li key={change.text} className="flex items-start gap-s12 text-label text-fg-primary">
          <Icon name={change.icon ?? 'check'} size="sm" className="mt-s4 text-fg-secondary" />
          {change.text}
        </li>
      ))}
    </ul>
  );
}
