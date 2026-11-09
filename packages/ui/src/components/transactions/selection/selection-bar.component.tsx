import { Button as AriaButton } from 'react-aria-components';

import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/index.ts';
import type { IconName } from '#/components/icons/index.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { SelectionAction } from '#/components/transactions/selection/selection-bar.type.ts';

const ACTIONS: { key: SelectionAction; label: string; icon: IconName }[] = [
  { key: 'categorize', label: 'Categorizar', icon: 'folder' },
  { key: 'tag', label: 'Tag', icon: 'hash' },
  { key: 'ignore', label: 'Ignorar', icon: 'eye-off' },
];

type SelectionBarProps = {
  /** Rows selected. */
  count: number;
  onAction: (action: SelectionAction) => void;
  /** The "x": leaves the selection mode. */
  onClose: () => void;
  className?: string;
};

/**
 * Floating action bar of the selection mode (components.md 7): glass, radius 16, sticky at the foot
 * of the visible area (above the bottom navigation on the phone), never a page footer. On the phone only the 22 px icons show; the labels stay
 * for screen readers. While it is open the shell hides the floating "+" (it matches
 * `[data-selection-bar]`), because the bar and the "+" share the bottom edge and the selection
 * actions replace creating something new.
 */
export function SelectionBar({ count, onAction, onClose, className }: SelectionBarProps) {
  return (
    <div
      role="toolbar"
      data-selection-bar
      aria-label="Ações para as transações selecionadas"
      className={cx(
        'sticky bottom-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom)+var(--space-16))] z-(--z-raised) mx-s16 flex items-center justify-between gap-s4 rounded-panel border border-line bg-selection-bar px-s8 py-s4 shadow-(--shadow-bulk-bar) backdrop-blur-(--blur-selection-bar) backdrop-saturate-150',
        'lg:bottom-s24 lg:mx-auto lg:w-fit lg:justify-start lg:gap-s12',
        className,
      )}
    >
      <p
        aria-live="polite"
        className="shrink-0 px-s4 text-list whitespace-nowrap text-fg-primary lg:px-s8"
      >
        <span className="font-emphasis tabular-nums">{count}</span>{' '}
        {count === 1 ? 'selecionada' : 'selecionadas'}
      </p>
      <span aria-hidden="true" className="hidden h-s24 w-px bg-line lg:block" />
      <div className="flex items-center gap-s4">
        {ACTIONS.map((action) => (
          <AriaButton
            key={action.key}
            aria-label={action.label}
            onPress={() => onAction(action.key)}
            className="focus-ring flex min-h-ctl-touch min-w-ctl-touch cursor-pointer items-center justify-center gap-s8 rounded-input px-s8 text-label font-emphasis lg:px-s12 text-fg-primary transition-colors duration-(--duration-fast) data-[hovered]:bg-subtle data-[pressed]:bg-subtle"
          >
            <Icon name={action.icon} size="lg" className="text-brand lg:size-4.5" />
            <span className="sr-only lg:not-sr-only">{action.label}</span>
          </AriaButton>
        ))}
      </div>
      <Button iconOnly variant="tertiary" icon="close" label="Sair da seleção" onPress={onClose} />
    </div>
  );
}
