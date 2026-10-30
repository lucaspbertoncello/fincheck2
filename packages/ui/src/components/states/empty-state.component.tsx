import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

export type EmptyStateAction = {
  label: string;
  onPress: () => void;
  icon?: IconName;
};

type EmptyStateProps = {
  /** 48 px icon in the secondary text color. */
  icon: IconName;
  /** "Nenhuma transação em outubro ainda" (20 / 550). */
  title: string;
  /** One sentence, up to about 40 characters wide. */
  description?: string;
  /** Primary action ("Conectar contas"). */
  primaryAction?: EmptyStateAction;
  /** Secondary action ("Lançar transação"). */
  secondaryAction?: EmptyStateAction;
  /** Heading level of the title, to fit the page outline. */
  headingLevel?: 2 | 3;
  className?: string;
};

/**
 * Empty state (components.md 14.1): glass card, centered icon, title, one sentence and up to two
 * actions. Transactions, recurrences, bills, rules, the review queue ("Tudo revisado") and the first
 * connection use it.
 */
export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <div
      className={cx(
        'glass flex flex-col items-center gap-s12 px-s24 py-s48 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center text-fg-secondary [&>svg]:size-12">
        <Icon name={icon} size="lg" />
      </span>
      <Heading className="font-title text-xl leading-(--line-height-title) font-heading text-fg-primary">
        {title}
      </Heading>
      {description ? <p className="max-w-sm text-body text-fg-secondary">{description}</p> : null}
      {primaryAction || secondaryAction ? (
        <div className="flex flex-col items-stretch gap-s12 pt-s4 lg:flex-row lg:items-center">
          {primaryAction ? (
            <Button icon={primaryAction.icon} onPress={primaryAction.onPress}>
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              variant="secondary"
              icon={secondaryAction.icon}
              onPress={secondaryAction.onPress}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
